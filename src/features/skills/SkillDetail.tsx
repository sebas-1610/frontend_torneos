import { CircleAlert, Pencil, Power, PowerOff, Trash2 } from 'lucide-react'
import { useEffect, useState, type Ref } from 'react'
import { errorMessage } from '../../api/client'
import type { PlayerSummary } from '../../api/players'
import { findPlayersBySkill } from '../../api/playerSkills'
import type { Skill } from '../../api/skills'
import { AnimatedNumber } from '../../components/AnimatedNumber'
import { initials } from '../../utils/initials'
import { categoryOf } from './categories'
import { SkillIcon } from './SkillIcon'

interface SkillDetailProps {
  ref?: Ref<HTMLElement>
  skill: Skill | null // null: no hay habilidades que mostrar
  emptyMessage: string
  busy: boolean
  error: string | null // error de la última acción (ej: no se puede eliminar porque está asignada)
  canUpdate: boolean
  canDelete: boolean
  canSeePlayers: boolean // asignacion-habilidades · Listar: sin él solo se muestra cuántos jugadores
  onEdit: (skill: Skill) => void
  onToggleActive: (skill: Skill) => void
  onDelete: (skill: Skill) => void
}

// Panel derecho de Habilidades: la habilidad elegida y los jugadores que la tienen (HU-GD-06 y 07).
export function SkillDetail({
  ref,
  skill,
  emptyMessage,
  busy,
  error,
  canUpdate,
  canDelete,
  canSeePlayers,
  onEdit,
  onToggleActive,
  onDelete,
}: SkillDetailProps) {
  if (!skill) {
    return (
      <aside ref={ref} className="rail rail--detail" aria-label="Detalle de la habilidad">
        <section className="panel">
          <p className="empty-state">{emptyMessage}</p>
        </section>
      </aside>
    )
  }

  const category = categoryOf(skill.category)
  const players = skill.playersCount
  return (
    <aside ref={ref} className="rail rail--detail" aria-label="Detalle de la habilidad">
      <section className="panel summary" aria-labelledby="skill-detail-title">
        <div className="detail__head">
          <span className="detail__glyph">
            <SkillIcon skill={skill} size={30} />
          </span>
          <div className="detail__identity">
            <h2 id="skill-detail-title" className="detail__name">
              {skill.name}
            </h2>
            <p className="detail__meta">Habilidad {category.label.toLowerCase()}</p>
          </div>
        </div>

        <p className="detail__description">{skill.description ?? <span className="dash">Sin descripción.</span>}</p>

        <div className="score">
          <p className="score__label">Jugadores con esta habilidad</p>
          <p className="score__figure">
            <AnimatedNumber value={players} className="score__value" />
            <span className="score__of">{players === 1 ? 'jugador' : 'jugadores'}</span>
          </p>
        </div>

        <dl className="facts">
          <div>
            <dt>Estado</dt>
            <dd>
              <span className={`pill ${skill.active ? 'pill--positive' : 'pill--neutral'}`}>
                <span className="status-dot" aria-hidden="true" />
                {skill.active ? 'Activa' : 'Inactiva'}
              </span>
            </dd>
          </div>
        </dl>
        {!skill.active && (
          <p className="detail__empty">No se puede asignar a más jugadores; los que ya la tienen la conservan.</p>
        )}

        {error && (
          <p className="login__error detail__error" role="alert">
            {error}
          </p>
        )}

        {canUpdate && (
          <div className="detail__actions">
            <button type="button" className="button button--outline" disabled={busy} onClick={() => onEdit(skill)}>
              <Pencil size={16} aria-hidden="true" />
              Editar
            </button>
            <button
              type="button"
              className="button button--text"
              disabled={busy}
              onClick={() => onToggleActive(skill)}
            >
              {skill.active ? <PowerOff size={16} aria-hidden="true" /> : <Power size={16} aria-hidden="true" />}
              {skill.active ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        )}
        {/* Lo que borra va aparte, lejos de Editar. */}
        {canDelete && (
          <div className="detail__danger">
            <button
              type="button"
              className="button button--text row-actions__danger"
              disabled={busy}
              onClick={() => onDelete(skill)}
            >
              <Trash2 size={16} aria-hidden="true" />
              Eliminar habilidad
            </button>
          </div>
        )}
      </section>

      {canSeePlayers && (
        <section className="panel" aria-labelledby="skill-players-title">
          <h2 id="skill-players-title" className="panel__title detail__section-title">
            Jugadores con esta habilidad
          </h2>
          {/* La key vuelve a pedir la lista al cambiar de habilidad o cuando cambia su cantidad de jugadores. */}
          <SkillPlayers key={`${skill.id}:${players}`} skill={skill} />
        </section>
      )}
    </aside>
  )
}

function SkillPlayers({ skill }: { skill: Skill }) {
  const [players, setPlayers] = useState<PlayerSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    findPlayersBySkill(skill.id)
      .then((list) => {
        if (active) setPlayers(list)
      })
      .catch((err) => {
        if (active) setError(errorMessage(err))
      })
    return () => {
      active = false
    }
  }, [skill.id, attempt])

  if (error) {
    return (
      <div className="inline-error" role="alert">
        <CircleAlert size={16} aria-hidden="true" />
        <span>{error}</span>
        <button
          type="button"
          className="text-action"
          onClick={() => {
            setError(null)
            setAttempt((value) => value + 1)
          }}
        >
          Reintentar
        </button>
      </div>
    )
  }
  if (players === null) {
    return (
      <p className="detail__empty" aria-busy="true">
        Cargando jugadores…
      </p>
    )
  }
  if (players.length === 0) {
    return <p className="detail__empty">Ningún jugador tiene {skill.name} todavía.</p>
  }
  return (
    <ul className="detail-list">
      {players.map((player) => {
        const fullName = `${player.firstName} ${player.lastName}`
        return (
          <li key={player.id} className="detail-list__item">
            <span className="avatar" aria-hidden="true">
              {initials(fullName)}
            </span>
            <span className="detail-list__name">
              {fullName}
              <span className="detail-list__detail">
                {player.documentType} {player.documentNumber}
              </span>
            </span>
            {!player.active && <span className="pill pill--neutral">Inactivo</span>}
          </li>
        )
      })}
    </ul>
  )
}
