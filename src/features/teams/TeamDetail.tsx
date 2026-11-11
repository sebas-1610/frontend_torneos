import { CalendarDays, Info, Link2, MapPin, Pencil, Power, PowerOff, Tag, Trash2, Trophy, Users } from 'lucide-react'
import type { CSSProperties, Ref } from 'react'
import type { Sport } from '../../api/sports'
import type { Team } from '../../api/teams'
import { ActionAlert, type ActionError } from '../../components/ActionAlert'
import { AnimatedNumber } from '../../components/AnimatedNumber'
import { SportIcon } from '../../components/SportIcon'
import { TeamMonogram } from '../../components/TeamMonogram'
import { formatDateShort } from '../../utils/dates'
import { hueFor } from '../../utils/hue'
import { kindOfSummary } from '../sports/sportKind'

interface TeamDetailProps {
  ref?: Ref<HTMLElement>
  team: Team | null // null: no hay equipos que mostrar
  sports: Sport[] // para el balón de cada deporte (vacía si la sesión no puede listar deportes)
  emptyMessage: string
  busy: boolean
  error: ActionError | null // la última acción rechazada (ej: no se puede eliminar porque tiene contratos)
  onDismissError: () => void
  canUpdate: boolean
  canDelete: boolean
  canAssociate: boolean // puede abrir "Asociar deportes"
  onEdit: (team: Team) => void
  onToggleActive: (team: Team) => void
  onDelete: (team: Team) => void
}

// Panel derecho de Equipos: el equipo elegido con sus datos, sus cifras y sus deportes (HU-GD-02 y 03).
export function TeamDetail({
  ref,
  team,
  sports,
  emptyMessage,
  busy,
  error,
  onDismissError,
  canUpdate,
  canDelete,
  canAssociate,
  onEdit,
  onToggleActive,
  onDelete,
}: TeamDetailProps) {
  const head = (
    <div className="panel-head">
      <span className="panel-head__icon" aria-hidden="true">
        <Info size={16} />
      </span>
      <h2 className="panel__title">Detalle del equipo</h2>
    </div>
  )

  if (!team) {
    return (
      <aside ref={ref} className="rail rail--detail rail--single" aria-label="Detalle del equipo">
        <section className="panel">
          {head}
          <p className="empty-state">{emptyMessage}</p>
        </section>
      </aside>
    )
  }

  const players = team.playersCount
  return (
    <aside ref={ref} className="rail rail--detail rail--single" aria-label="Detalle del equipo">
      <section className="panel" aria-labelledby="team-detail-title">
        {head}
        {error && <ActionAlert error={error} onDismiss={onDismissError} />}

        <div className="detail-cols">
          <div className="detail-cols__main">
            <div className="hero" style={{ '--hue': hueFor(team.id) } as CSSProperties}>
              <TeamMonogram team={team} size="xl" />
              <div className="hero__text">
                <h3 id="team-detail-title" className="hero__name">
                  {team.name}
                </h3>
                <span className={`pill ${team.active ? 'pill--positive' : 'pill--neutral'}`}>
                  <span className="status-dot" aria-hidden="true" />
                  {team.active ? 'Activo' : 'Inactivo'}
                </span>
                <ul className="hero__facts">
                  <li>
                    <MapPin size={14} aria-hidden="true" />
                    <span>
                      Ciudad: <strong>{team.city}</strong>
                    </span>
                  </li>
                  <li>
                    <CalendarDays size={14} aria-hidden="true" />
                    <span>
                      Fundación: <strong>{team.foundationDate ? formatDateShort(team.foundationDate) : 'sin fecha'}</strong>
                    </span>
                  </li>
                  <li>
                    <Tag size={14} aria-hidden="true" />
                    <span>
                      Nombre corto: <strong>{team.shortName ?? '—'}</strong>
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="stat-tiles">
              <p className="stat-tile" style={{ '--tile': 'var(--tone-green)' } as CSSProperties}>
                <span className="stat-tile__icon" aria-hidden="true">
                  <Trophy size={20} />
                </span>
                <AnimatedNumber value={team.sports.length} className="stat-tile__value" />
                <span className="stat-tile__label">
                  {team.sports.length === 1 ? 'Deporte asociado' : 'Deportes asociados'}
                </span>
              </p>
              <p className="stat-tile" style={{ '--tile': 'var(--tone-blue)' } as CSSProperties}>
                <span className="stat-tile__icon" aria-hidden="true">
                  <Users size={20} />
                </span>
                <AnimatedNumber value={players} className="stat-tile__value" />
                <span className="stat-tile__label">{players === 1 ? 'Jugador actual' : 'Jugadores actuales'}</span>
              </p>
            </div>
            {!team.active && (
              <p className="detail__empty detail__note">
                No recibe deportes ni jugadores nuevos hasta que lo actives.
              </p>
            )}
          </div>

          <div className="detail-cols__side">
            <div className="detail-section">
              <div className="detail-section__head">
                <h3 className="detail-section__title">Descripción</h3>
              </div>
              <p className="detail-section__text">{team.description ?? 'Sin descripción.'}</p>
            </div>

            <div className="detail-section">
              <div className="detail-section__head">
                <h3 className="detail-section__title">Deportes asociados</h3>
                {canAssociate && (
                  <a className="button button--text detail__add" href={`#equipos-deportes/${team.id}`}>
                    <Link2 size={16} aria-hidden="true" />
                    Asociar
                  </a>
                )}
              </div>
              {team.sports.length === 0 ? (
                <p className="detail__empty">{team.name} todavía no participa en ningún deporte.</p>
              ) : (
                <ul className="chip-list">
                  {team.sports.map((sport) => (
                    <li key={sport.id} className={`chip${sport.active ? '' : ' is-inactive'}`}>
                      <SportIcon kind={kindOfSummary(sport, sports)} id={sport.id} size={18} />
                      {sport.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {(canUpdate || canDelete) && (
            <div className="detail-cols__actions">
              {canUpdate && (
                <div className="detail__actions">
                  <button
                    type="button"
                    className="button button--tint button--tint-blue"
                    disabled={busy}
                    onClick={() => onEdit(team)}
                  >
                    <Pencil size={16} aria-hidden="true" />
                    Editar
                  </button>
                  <button
                    type="button"
                    className={`button button--tint ${team.active ? 'button--tint-red' : 'button--tint-green'}`}
                    disabled={busy}
                    onClick={() => onToggleActive(team)}
                  >
                    {team.active ? <PowerOff size={16} aria-hidden="true" /> : <Power size={16} aria-hidden="true" />}
                    {team.active ? 'Desactivar' : 'Activar'}
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
                    onClick={() => onDelete(team)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Eliminar equipo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </aside>
  )
}
