import { CircleAlert, Pencil, Plus, Power, PowerOff, Trash2 } from 'lucide-react'
import { useEffect, useState, type Ref } from 'react'
import { errorMessage } from '../../api/client'
import type { Sport } from '../../api/sports'
import type { TeamSummary } from '../../api/teams'
import { findTeamsBySport } from '../../api/teamSports'
import { AnimatedNumber } from '../../components/AnimatedNumber'
import { SportIcon } from '../../components/SportIcon'
import { hueFor } from '../../utils/hue'
import { RoleMonogram } from '../roles/RoleSelect'
import { resolveSportKind, sportKindOf } from './sportKind'

interface SportDetailProps {
  ref?: Ref<HTMLElement>
  sport: Sport | null // null: no hay deportes que mostrar
  sports: Sport[] // para el balón de los subdeportes sin palabra conocida (usan el de su padre)
  emptyMessage: string
  busy: boolean
  error: string | null // error de la última acción (ej: no se puede eliminar porque tiene subdeportes)
  canAddSub: boolean
  canUpdate: boolean
  canDelete: boolean
  canSeeTeams: boolean // asignacion-deportes · Listar: sin él solo se muestra cuántos equipos tiene
  onSelect: (sportId: number) => void
  onAddSub: (sport: Sport) => void
  onEdit: (sport: Sport) => void
  onToggleActive: (sport: Sport) => void
  onDelete: (sport: Sport) => void
}

// Panel derecho de Deportes: el deporte elegido con sus subdeportes y sus equipos (HU-GD-01 y 03).
export function SportDetail({
  ref,
  sport,
  sports,
  emptyMessage,
  busy,
  error,
  canAddSub,
  canUpdate,
  canDelete,
  canSeeTeams,
  onSelect,
  onAddSub,
  onEdit,
  onToggleActive,
  onDelete,
}: SportDetailProps) {
  if (!sport) {
    return (
      <aside ref={ref} className="rail rail--detail" aria-label="Detalle del deporte">
        <section className="panel">
          <p className="empty-state">{emptyMessage}</p>
        </section>
      </aside>
    )
  }

  const { parent, teamsCount: teams } = sport
  const kind = resolveSportKind(sport, sports)
  return (
    <aside ref={ref} className="rail rail--detail" aria-label="Detalle del deporte">
      <section className="panel summary" aria-labelledby="sport-detail-title">
        <div className="detail__head">
          <span className="detail__glyph">
            <SportIcon kind={kind} id={sport.id} size={40} />
          </span>
          <div className="detail__identity">
            <h2 id="sport-detail-title" className="detail__name">
              {sport.name}
            </h2>
            <p className="detail__meta">
              {parent ? (
                <>
                  Subdeporte de{' '}
                  <button type="button" className="detail__link" onClick={() => onSelect(parent.id)}>
                    {parent.name}
                  </button>
                </>
              ) : (
                'Deporte principal'
              )}
            </p>
          </div>
        </div>

        <p className="detail__description">{sport.description ?? <span className="dash">Sin descripción.</span>}</p>

        <div className="score">
          <p className="score__label">Equipos asociados</p>
          <p className="score__figure">
            <AnimatedNumber value={teams} className="score__value" />
            <span className="score__of">{teams === 1 ? 'equipo participa' : 'equipos participan'}</span>
          </p>
        </div>

        <dl className="facts">
          <div>
            <dt>Estado</dt>
            <dd>
              <span className={`pill ${sport.active ? 'pill--positive' : 'pill--neutral'}`}>
                <span className="status-dot" aria-hidden="true" />
                {sport.active ? 'Activo' : 'Inactivo'}
              </span>
            </dd>
          </div>
        </dl>
        {!sport.active && (
          <p className="detail__empty">No recibe equipos nuevos ni puede ser deporte padre hasta que lo actives.</p>
        )}

        {error && (
          <p className="login__error detail__error" role="alert">
            {error}
          </p>
        )}

        {canUpdate && (
          <div className="detail__actions">
            <button type="button" className="button button--outline" disabled={busy} onClick={() => onEdit(sport)}>
              <Pencil size={16} aria-hidden="true" />
              Editar
            </button>
            <button
              type="button"
              className="button button--text"
              disabled={busy}
              onClick={() => onToggleActive(sport)}
            >
              {sport.active ? <PowerOff size={16} aria-hidden="true" /> : <Power size={16} aria-hidden="true" />}
              {sport.active ? 'Desactivar' : 'Activar'}
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
              onClick={() => onDelete(sport)}
            >
              <Trash2 size={16} aria-hidden="true" />
              Eliminar deporte
            </button>
          </div>
        )}
      </section>

      <section className="panel" aria-labelledby="sport-subs-title">
        <div className="detail__section-head">
          <h2 id="sport-subs-title" className="panel__title">
            Subdeportes
          </h2>
          {/* Un deporte desactivado no puede ser padre: el backend lo rechazaría. */}
          {canAddSub && sport.active && (
            <button type="button" className="button button--text detail__add" onClick={() => onAddSub(sport)}>
              <Plus size={16} aria-hidden="true" />
              Agregar
            </button>
          )}
        </div>
        {sport.subSports.length === 0 ? (
          <p className="detail__empty">{sport.name} no tiene subdeportes.</p>
        ) : (
          <ul className="detail-list">
            {sport.subSports.map((sub) => {
              const subKind = sportKindOf(sub.name)
              return (
                <li key={sub.id}>
                  <button
                    type="button"
                    className="detail-list__item detail-list__button"
                    onClick={() => onSelect(sub.id)}
                  >
                    <SportIcon kind={subKind === 'generic' ? kind : subKind} id={sub.id} size={26} />
                    <span className="detail-list__name">{sub.name}</span>
                    {!sub.active && <span className="pill pill--neutral">Inactivo</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {canSeeTeams && (
        <section className="panel" aria-labelledby="sport-teams-title">
          <h2 id="sport-teams-title" className="panel__title detail__section-title">
            Equipos asociados
          </h2>
          {/* La key vuelve a pedir la lista al cambiar de deporte o cuando cambia su cantidad de equipos. */}
          <SportTeams key={`${sport.id}:${teams}`} sport={sport} />
        </section>
      )}
    </aside>
  )
}

function SportTeams({ sport }: { sport: Sport }) {
  const [teams, setTeams] = useState<TeamSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    findTeamsBySport(sport.id)
      .then((list) => {
        if (active) setTeams(list)
      })
      .catch((err) => {
        if (active) setError(errorMessage(err))
      })
    return () => {
      active = false
    }
  }, [sport.id, attempt])

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
  if (teams === null) {
    return (
      <p className="detail__empty" aria-busy="true">
        Cargando equipos…
      </p>
    )
  }
  if (teams.length === 0) {
    return <p className="detail__empty">Ningún equipo participa en {sport.name} todavía.</p>
  }
  return (
    <ul className="detail-list">
      {teams.map((team) => (
        <li key={team.id} className="detail-list__item">
          <RoleMonogram name={team.name} hue={hueFor(team.id)} size="sm" />
          <span className="detail-list__name">{team.name}</span>
          {!team.active && <span className="pill pill--neutral">Inactivo</span>}
        </li>
      ))}
    </ul>
  )
}
