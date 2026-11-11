import { CircleAlert, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { errorMessage } from '../../api/client'
import { deleteSport, disableSport, enableSport, findSports, type Sport } from '../../api/sports'
import { RESOURCES, useAccess } from '../../auth/access'
import { SubjectVisual } from '../../components/ConfirmDialog'
import { EntityCard } from '../../components/EntityCard'
import { SportIcon } from '../../components/SportIcon'
import { useConfirm } from '../../hooks/useConfirm'
import { useToast } from '../../hooks/useToast'
import { normalize } from '../roles/labels'
import { SportDetail } from './SportDetail'
import { SportFormDialog } from './SportFormDialog'
import { resolveSportKind } from './sportKind'
import { treeOrder } from './sportTree'
import '../../components/ListPage.css'
import '../../components/DetailPanel.css'

type StatusFilter = '' | 'activos' | 'inactivos'

interface FormState {
  sport: Sport | null // null: crear
  parentId: number | null // padre ya elegido al crear un subdeporte
}

// En pantallas angostas el detalle queda debajo del catálogo: "Ver" baja hasta él.
const STACKED = '(max-width: 1279px)'

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

function sportKindLabel(sport: Sport): string {
  if (sport.parent) return `Subdeporte de ${sport.parent.name}`
  return sport.subSports.length > 0
    ? `Principal · ${plural(sport.subSports.length, 'subdeporte', 'subdeportes')}`
    : 'Deporte principal'
}

// Pantalla "Deportes" (HU-GD-01): tarjetas con el balón de cada deporte (los subdeportes justo después
// de su padre), búsqueda, filtro de estado, crear, agregar subdeporte, editar, activar/desactivar y
// eliminar. A la derecha, el detalle con sus subdeportes y los equipos asociados (HU-GD-03).
export function SportsPage() {
  const { can } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const { showToast, toast } = useToast()
  const canCreate = can(RESOURCES.sports, 'CREATE')
  const canUpdate = can(RESOURCES.sports, 'UPDATE')
  const canDelete = can(RESOURCES.sports, 'DELETE')
  const canSeeTeams = can(RESOURCES.teamSports, 'LIST')

  const [sports, setSports] = useState<Sport[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [actionError, setActionError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editing, setEditing] = useState<FormState | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const detailRef = useRef<HTMLElement>(null)

  // Se vuelve a pedir la lista completa tras cada cambio: crear o borrar un subdeporte también cambia
  // la tarjeta de su padre.
  useEffect(() => {
    let active = true
    findSports()
      .then((list) => {
        if (!active) return
        setSports(list)
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

  // El backend no filtra: la búsqueda (nombre o descripción, sin tildes) y el estado se aplican aquí,
  // conservando el orden del árbol.
  const visible = useMemo(() => {
    const text = normalize(query.trim())
    return treeOrder(sports)
      .map((row) => row.sport)
      .filter(
        (sport) =>
          (status === '' || sport.active === (status === 'activos')) &&
          (!text || normalize(sport.name).includes(text) || normalize(sport.description ?? '').includes(text)),
      )
  }, [sports, query, status])

  // El elegido; si no hay (o quedó fuera de la lista), el primero que se ve.
  const selected = sports.find((sport) => sport.id === selectedId) ?? visible[0] ?? null

  const activeCount = sports.filter((sport) => sport.active).length
  const activeText = `${activeCount} ${activeCount === 1 ? 'activo' : 'activos'}`
  const mostTeams = sports.reduce<Sport | null>(
    (best, sport) => (sport.teamsCount > (best?.teamsCount ?? 0) ? sport : best),
    null,
  )
  const finding = loading
    ? 'Cargando deportes…'
    : loadError
      ? 'No se pudo cargar la lista de deportes.'
      : sports.length === 0
        ? 'Todavía no hay deportes registrados.'
        : `${plural(sports.length, 'deporte registrado', 'deportes registrados')}, ${activeText}.` +
          (mostTeams ? ` ${mostTeams.name} es el que más equipos tiene (${mostTeams.teamsCount}).` : '')

  function select(sportId: number, reveal: boolean) {
    if (sportId !== selected?.id) setActionError(null)
    setSelectedId(sportId)
    if (reveal && window.matchMedia(STACKED).matches) {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      // Después de pintar el detalle nuevo.
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' }))
    }
  }

  function upsert(saved: Sport) {
    setSports((list) =>
      list.some((sport) => sport.id === saved.id)
        ? list.map((sport) => (sport.id === saved.id ? saved : sport))
        : [...list, saved],
    )
  }

  async function runAction(sport: Sport, action: () => Promise<void>) {
    setBusyId(sport.id)
    setActionError(null)
    try {
      await action()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  function subjectOf(sport: Sport) {
    return (
      <SubjectVisual
        visual={<SportIcon kind={resolveSportKind(sport, sports)} id={sport.id} size={20} />}
        name={sport.name}
        detail={sport.parent ? `Subdeporte de ${sport.parent.name}` : 'Deporte principal'}
      />
    )
  }

  async function toggleActive(sport: Sport) {
    if (sport.active) {
      const confirmed = await confirm({
        title: `¿Desactivar ${sport.name}?`,
        message:
          'No se podrá asociar a equipos nuevos ni elegir como deporte padre. ' +
          'Sus subdeportes y los equipos que ya tiene se conservan.',
        confirmLabel: 'Desactivar deporte',
        tone: 'neutral',
        subject: subjectOf(sport),
      })
      if (!confirmed) return
    }
    await runAction(sport, async () => {
      const saved = await (sport.active ? disableSport(sport.id) : enableSport(sport.id))
      upsert(saved)
      showToast(saved.active ? `${saved.name} quedó activo.` : `${saved.name} quedó desactivado.`)
      reload()
    })
  }

  async function remove(sport: Sport) {
    const confirmed = await confirm({
      title: `¿Eliminar ${sport.name}?`,
      message:
        'Se borra del sistema. Si tiene subdeportes o equipos asociados no se puede eliminar: ' +
        'en ese caso, desactívalo.',
      confirmLabel: 'Eliminar deporte',
      subject: subjectOf(sport),
    })
    if (!confirmed) return
    await runAction(sport, async () => {
      await deleteSport(sport.id) // 400 con el motivo si tiene subdeportes o equipos (HU-GD-01)
      setSports((list) => list.filter((item) => item.id !== sport.id))
      showToast(`Se eliminó ${sport.name}.`)
      reload()
    })
  }

  return (
    <div className="page">
      <div className="page__head list-head">
        <div>
          <h1 className="page__title">Deportes</h1>
          <p className="page__finding">{finding}</p>
        </div>
        {canCreate && (
          <button
            type="button"
            className="button button--primary"
            onClick={() => setEditing({ sport: null, parentId: null })}
          >
            <Plus size={18} aria-hidden="true" />
            Nuevo deporte
          </button>
        )}
      </div>

      <div className="page__grid">
        <section className="panel" aria-label="Deportes registrados" aria-busy={loading}>
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
              aria-label="Filtrar por estado"
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
            >
              <option value="">Todos los estados</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
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
            <p className="empty-state">Cargando deportes…</p>
          ) : visible.length === 0 ? (
            <p className="empty-state">
              {sports.length === 0
                ? canCreate
                  ? 'No hay deportes registrados. Crea el primero con "Nuevo deporte".'
                  : 'No hay deportes registrados.'
                : 'Ningún deporte coincide con los filtros.'}
            </p>
          ) : (
            <ul className="card-grid">
              {visible.map((sport, index) => (
                <EntityCard
                  key={sport.id}
                  index={index}
                  layout="center"
                  visual={<SportIcon kind={resolveSportKind(sport, sports)} id={sport.id} size={48} />}
                  name={sport.name}
                  meta={sportKindLabel(sport)}
                  figure={sport.teamsCount}
                  unit={sport.teamsCount === 1 ? 'equipo' : 'equipos'}
                  inactiveLabel={sport.active ? null : 'Inactivo'}
                  selected={sport.id === selected?.id}
                  busy={busyId === sport.id}
                  canEdit={canUpdate}
                  canDelete={canDelete}
                  onSelect={() => select(sport.id, false)}
                  onView={() => select(sport.id, true)}
                  onEdit={() => setEditing({ sport, parentId: null })}
                  onDelete={() => remove(sport)}
                />
              ))}
            </ul>
          )}
        </section>

        <SportDetail
          ref={detailRef}
          sport={loading || loadError ? null : selected}
          sports={sports}
          emptyMessage={
            loading
              ? 'Cargando deportes…'
              : loadError
                ? 'Cuando la lista cargue, aquí verás el detalle del deporte elegido.'
                : sports.length === 0
                  ? 'Cuando registres un deporte, aquí verás sus subdeportes y equipos.'
                  : 'Ningún deporte coincide con los filtros.'
          }
          busy={selected !== null && busyId === selected.id}
          error={actionError}
          canAddSub={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canSeeTeams={canSeeTeams}
          onSelect={(sportId) => select(sportId, false)}
          onAddSub={(parent) => setEditing({ sport: null, parentId: parent.id })}
          onEdit={(sport) => setEditing({ sport, parentId: null })}
          onToggleActive={toggleActive}
          onDelete={remove}
        />
      </div>

      {editing && (
        <SportFormDialog
          sport={editing.sport}
          initialParentId={editing.parentId}
          sports={sports}
          onClose={() => setEditing(null)}
          onSaved={(saved, isNew) => {
            setEditing(null)
            upsert(saved)
            setSelectedId(saved.id)
            setActionError(null)
            showToast(isNew ? `${saved.name} quedó registrado.` : 'Cambios guardados.')
            reload()
          }}
        />
      )}
      {confirmDialog}
      {toast}
    </div>
  )
}
