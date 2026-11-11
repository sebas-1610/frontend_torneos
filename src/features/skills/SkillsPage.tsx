import { CircleAlert, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { errorMessage } from '../../api/client'
import {
  deleteSkill,
  disableSkill,
  enableSkill,
  findSkills,
  type Skill,
  type SkillCategory,
} from '../../api/skills'
import { RESOURCES, useAccess } from '../../auth/access'
import { SubjectVisual } from '../../components/ConfirmDialog'
import { EntityCard } from '../../components/EntityCard'
import { useConfirm } from '../../hooks/useConfirm'
import { useToast } from '../../hooks/useToast'
import { normalize } from '../roles/labels'
import { CATEGORIES, categoryOf } from './categories'
import { SkillDetail } from './SkillDetail'
import { SkillFormDialog } from './SkillFormDialog'
import { SkillIcon } from './SkillIcon'
import '../../components/ListPage.css'
import '../../components/DetailPanel.css'

// En pantallas angostas el detalle queda debajo del catálogo: "Ver" baja hasta él.
const STACKED = '(max-width: 1279px)'

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

// Pantalla "Habilidades" (HU-GD-06): catálogo en tarjetas agrupado por categoría, búsqueda, filtro de
// categoría, crear, editar, activar/desactivar y eliminar. A la derecha, el detalle con los jugadores que
// la tienen (HU-GD-07).
export function SkillsPage() {
  const { can } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const { showToast, toast } = useToast()
  const canCreate = can(RESOURCES.skills, 'CREATE')
  const canUpdate = can(RESOURCES.skills, 'UPDATE')
  const canDelete = can(RESOURCES.skills, 'DELETE')
  const canSeePlayers = can(RESOURCES.playerSkills, 'LIST')

  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<SkillCategory | ''>('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Skill | 'new' | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const detailRef = useRef<HTMLElement>(null)

  useEffect(() => {
    let active = true
    findSkills()
      .then((list) => {
        if (!active) return
        setSkills(list)
        setLoadError(null)
      })
      .catch((err) => {
        if (active) setLoadError(errorMessage(err)) // ej: 503 si ms_torneos_security no responde
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [reloadKey])

  const reload = () => setReloadKey((key) => key + 1)

  // El backend no filtra: búsqueda por nombre o descripción (sin tildes) y categoría, aquí.
  const groups = useMemo(() => {
    const text = normalize(query.trim())
    const visible = skills.filter(
      (skill) =>
        (!categoryFilter || skill.category === categoryFilter) &&
        (!text || normalize(skill.name).includes(text) || normalize(skill.description ?? '').includes(text)),
    )
    return CATEGORIES.map((category) => ({
      category,
      items: visible.filter((skill) => skill.category === category.key),
    })).filter((group) => group.items.length > 0)
  }, [skills, query, categoryFilter])

  // La elegida; si no hay (o se eliminó), la primera tarjeta que se ve.
  const selected = skills.find((skill) => skill.id === selectedId) ?? groups[0]?.items[0] ?? null

  const activeCount = skills.filter((skill) => skill.active).length
  const activeText = `${activeCount} ${activeCount === 1 ? 'activa' : 'activas'}`
  const mostAssigned = skills.reduce<Skill | null>(
    (best, skill) => (skill.playersCount > (best?.playersCount ?? 0) ? skill : best),
    null,
  )
  const finding = loading
    ? 'Cargando habilidades…'
    : loadError
      ? 'No se pudo cargar el catálogo de habilidades.'
      : skills.length === 0
        ? 'Todavía no hay habilidades en el catálogo.'
        : `${plural(skills.length, 'habilidad', 'habilidades')} en el catálogo, ${activeText}.` +
          (mostAssigned
            ? ` La más asignada es ${mostAssigned.name} (${plural(mostAssigned.playersCount, 'jugador', 'jugadores')}).`
            : '')

  function select(skillId: number, reveal: boolean) {
    if (skillId !== selected?.id) setActionError(null)
    setSelectedId(skillId)
    if (reveal && window.matchMedia(STACKED).matches) {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' }))
    }
  }

  function upsert(saved: Skill) {
    setSkills((list) =>
      list.some((skill) => skill.id === saved.id)
        ? list.map((skill) => (skill.id === saved.id ? saved : skill))
        : [...list, saved],
    )
  }

  async function runAction(action: () => Promise<void>) {
    setBusy(true)
    setActionError(null)
    try {
      await action()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function subjectOf(skill: Skill) {
    const category = categoryOf(skill.category)
    return (
      <SubjectVisual
        visual={<SkillIcon skill={skill} size={18} />}
        name={skill.name}
        detail={`Habilidad ${category.label.toLowerCase()}`}
      />
    )
  }

  async function toggleActive(skill: Skill) {
    if (skill.active) {
      const players = skill.playersCount
      const confirmed = await confirm({
        title: `¿Desactivar ${skill.name}?`,
        message:
          players === 0
            ? 'No se podrá asignar a ningún jugador hasta que la actives.'
            : players === 1
              ? 'No se podrá asignar a más jugadores. El jugador que ya la tiene la conserva.'
              : `No se podrá asignar a más jugadores. Los ${players} jugadores que ya la tienen la conservan.`,
        confirmLabel: 'Desactivar habilidad',
        tone: 'neutral',
        subject: subjectOf(skill),
      })
      if (!confirmed) return
    }
    await runAction(async () => {
      const saved = await (skill.active ? disableSkill(skill.id) : enableSkill(skill.id))
      upsert(saved)
      showToast(saved.active ? `${saved.name} quedó activa.` : `${saved.name} quedó desactivada.`)
    })
  }

  async function remove(skill: Skill) {
    const confirmed = await confirm({
      title: `¿Eliminar ${skill.name}?`,
      message:
        'Se borra del catálogo. Si está asignada a algún jugador no se puede eliminar: ' +
        'retírasela primero o desactívala.',
      confirmLabel: 'Eliminar habilidad',
      subject: subjectOf(skill),
    })
    if (!confirmed) return
    await runAction(async () => {
      await deleteSkill(skill.id) // 400 con a cuántos jugadores está asignada (HU-GD-06)
      setSkills((list) => list.filter((item) => item.id !== skill.id))
      showToast(`Se eliminó ${skill.name}.`)
      reload()
    })
  }

  let cardIndex = 0
  return (
    <div className="page">
      <div className="page__head list-head">
        <div>
          <h1 className="page__title">Habilidades</h1>
          <p className="page__finding">{finding}</p>
        </div>
        {canCreate && (
          <button type="button" className="button button--primary" onClick={() => setEditing('new')}>
            <Plus size={18} aria-hidden="true" />
            Nueva habilidad
          </button>
        )}
      </div>

      <div className="page__grid">
        <section className="panel" aria-label="Catálogo de habilidades" aria-busy={loading}>
          <div className="list-filters">
            <label className="list-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                placeholder="Buscar por nombre o descripción"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label="Filtrar por categoría"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as SkillCategory | '')}
            >
              <option value="">Todas las categorías</option>
              {CATEGORIES.map((category) => (
                <option key={category.key} value={category.key}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {loadError ? (
            <div className="inline-error" role="alert">
              <CircleAlert size={16} aria-hidden="true" />
              <span>{loadError}</span>
              <button
                type="button"
                className="text-action"
                onClick={() => {
                  setLoading(true)
                  setLoadError(null)
                  reload()
                }}
              >
                Reintentar
              </button>
            </div>
          ) : loading ? (
            <p className="empty-state">Cargando habilidades…</p>
          ) : groups.length === 0 ? (
            <p className="empty-state">
              {skills.length === 0
                ? canCreate
                  ? 'El catálogo está vacío. Crea la primera habilidad con "Nueva habilidad".'
                  : 'El catálogo está vacío.'
                : 'Ninguna habilidad coincide con los filtros.'}
            </p>
          ) : (
            <div className="catalog">
              {groups.map(({ category, items }) => (
                <section key={category.key} className="catalog__group" aria-labelledby={`skills-${category.key}`}>
                  <h2 id={`skills-${category.key}`} className="catalog__title">
                    <span className="catalog__dot" style={{ '--tone': `var(${category.tone})` } as CSSProperties} />
                    {category.label}
                    <span className="catalog__count num">{items.length}</span>
                  </h2>
                  <ul className="card-grid">
                    {items.map((skill) => (
                      <EntityCard
                        key={skill.id}
                        index={cardIndex++}
                        layout="start"
                        visual={<SkillIcon skill={skill} size={30} />}
                        name={skill.name}
                        description={skill.description ?? 'Sin descripción.'}
                        figure={skill.playersCount}
                        unit={skill.playersCount === 1 ? 'jugador' : 'jugadores'}
                        inactiveLabel={skill.active ? null : 'Inactiva'}
                        selected={skill.id === selected?.id}
                        busy={busy && skill.id === selected?.id}
                        canEdit={canUpdate}
                        canDelete={canDelete}
                        onSelect={() => select(skill.id, false)}
                        onView={() => select(skill.id, true)}
                        onEdit={() => setEditing(skill)}
                        onDelete={() => remove(skill)}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </section>

        <SkillDetail
          ref={detailRef}
          skill={loading || loadError ? null : selected}
          emptyMessage={
            loading
              ? 'Cargando habilidades…'
              : loadError
                ? 'Cuando el catálogo cargue, aquí verás el detalle de la habilidad elegida.'
                : skills.length === 0
                  ? 'Cuando registres una habilidad, aquí verás su detalle y los jugadores que la tienen.'
                  : 'Ninguna habilidad coincide con los filtros.'
          }
          busy={busy}
          error={actionError}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canSeePlayers={canSeePlayers}
          onEdit={(skill) => setEditing(skill)}
          onToggleActive={toggleActive}
          onDelete={remove}
        />
      </div>

      {editing && (
        <SkillFormDialog
          skill={editing === 'new' ? null : editing}
          initialCategory={categoryFilter || null}
          onClose={() => setEditing(null)}
          onSaved={(saved, isNew) => {
            setEditing(null)
            upsert(saved)
            setSelectedId(saved.id)
            setActionError(null)
            showToast(isNew ? `${saved.name} quedó en el catálogo.` : 'Cambios guardados.')
          }}
        />
      )}
      {confirmDialog}
      {toast}
    </div>
  )
}
