import {
  Activity,
  Cake,
  CalendarDays,
  Footprints,
  Globe,
  IdCard,
  Pencil,
  Ruler,
  Shield,
  Shirt,
  Trash2,
  UserRound,
  UserRoundCheck,
  UserRoundX,
} from 'lucide-react'
import type { CSSProperties, Ref } from 'react'
import { DOCUMENT_TYPES, DOMINANT_FEET, type Player } from '../../api/players'
import { ActionAlert, type ActionError } from '../../components/ActionAlert'
import { PlayerAvatar } from '../../components/PlayerAvatar'
import { TeamMonogram } from '../../components/TeamMonogram'
import { ageFrom, formatDate } from '../../utils/dates'
import { hueFor } from '../../utils/hue'
import { fullNameOf } from './playerName'
import { positionCode, positionColor } from './position'

interface PlayerDetailProps {
  ref?: Ref<HTMLElement>
  player: Player | null // null: no hay jugadores que mostrar
  emptyMessage: string
  busy: boolean
  error: ActionError | null // la última acción rechazada (ej: no se puede eliminar porque tiene contratos)
  onDismissError: () => void
  canUpdate: boolean
  canDelete: boolean
  onEdit: (player: Player) => void
  onToggleActive: (player: Player) => void
  onDelete: (player: Player) => void
}

// Panel derecho de Jugadores: el jugador elegido con su foto, sus datos y su equipo actual (HU-GD-04).
export function PlayerDetail({
  ref,
  player,
  emptyMessage,
  busy,
  error,
  onDismissError,
  canUpdate,
  canDelete,
  onEdit,
  onToggleActive,
  onDelete,
}: PlayerDetailProps) {
  const head = (
    <div className="panel-head">
      <span className="panel-head__icon" aria-hidden="true">
        <UserRound size={16} />
      </span>
      <h2 className="panel__title">Detalle del jugador</h2>
    </div>
  )

  if (!player) {
    return (
      <aside ref={ref} className="rail rail--detail rail--single" aria-label="Detalle del jugador">
        <section className="panel">
          {head}
          <p className="empty-state">{emptyMessage}</p>
        </section>
      </aside>
    )
  }

  const name = fullNameOf(player)
  const age = ageFrom(player.birthDate)
  const documentLabel = DOCUMENT_TYPES.find((type) => type.key === player.documentType)?.label
  const foot = DOMINANT_FEET.find((option) => option.key === player.dominantFoot)?.label
  const code = player.position ? positionCode(player.position) : null
  const [team] = player.currentTeams
  // El foco de luz toma el tono de su equipo; sin equipo, el suyo.
  const heroStyle = {
    '--hue': hueFor(team?.id ?? player.id),
    '--tag': player.position ? positionColor(player.position) : undefined,
  } as CSSProperties

  return (
    <aside ref={ref} className="rail rail--detail rail--single" aria-label="Detalle del jugador">
      <section className="panel" aria-labelledby="player-detail-title">
        {head}
        {error && <ActionAlert error={error} onDismiss={onDismissError} />}

        <div className="detail-cols">
          <div className="detail-cols__main">
            <div className="hero" style={heroStyle}>
              <span className="hero__portrait">
                <PlayerAvatar player={player} size="card" />
                {team && (
                  <span className="hero__badge" title={team.name}>
                    <TeamMonogram team={team} size="md" />
                  </span>
                )}
              </span>
              <div className="hero__text">
                <h3 id="player-detail-title" className="hero__name">
                  {name}
                </h3>
                {player.position ? (
                  <p className="hero__role">
                    {player.position}
                    {code && code !== player.position.toUpperCase() && ` (${code})`}
                  </p>
                ) : (
                  <p className="detail__meta">Sin posición registrada</p>
                )}
              </div>
            </div>
            {!player.active && (
              <p className="detail__empty detail__note">
                No recibe contratos ni habilidades nuevas hasta que lo actives.
              </p>
            )}
          </div>

          <div className="detail-cols__side">
            <dl className="facts facts--icons">
              <div>
                <dt title={documentLabel}>
                  <IdCard size={16} aria-hidden="true" />
                  Documento
                </dt>
                <dd>
                  {player.documentType} {player.documentNumber}
                </dd>
              </div>
              <div>
                <dt>
                  <CalendarDays size={16} aria-hidden="true" />
                  Edad
                </dt>
                <dd>
                  {age} {age === 1 ? 'año' : 'años'}
                </dd>
              </div>
              <div>
                <dt>
                  <Cake size={16} aria-hidden="true" />
                  Nacimiento
                </dt>
                <dd>{formatDate(player.birthDate)}</dd>
              </div>
              <div>
                <dt>
                  <Globe size={16} aria-hidden="true" />
                  Nacionalidad
                </dt>
                <dd>{player.nationality ?? <span className="dash">—</span>}</dd>
              </div>
              <div>
                <dt>
                  <Shirt size={16} aria-hidden="true" />
                  Posición
                </dt>
                <dd>
                  {player.position && code ? (
                    <span
                      className="tag"
                      title={player.position}
                      style={{ '--tag': positionColor(player.position) } as CSSProperties}
                    >
                      {code}
                    </span>
                  ) : (
                    <span className="dash">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>
                  <Ruler size={16} aria-hidden="true" />
                  Altura
                </dt>
                <dd>
                  {player.heightCm ? `${(player.heightCm / 100).toFixed(2)} m` : <span className="dash">—</span>}
                </dd>
              </div>
              <div>
                <dt>
                  <Footprints size={16} aria-hidden="true" />
                  Pie dominante
                </dt>
                <dd>{foot ?? <span className="dash">—</span>}</dd>
              </div>
              <div>
                <dt>
                  <Activity size={16} aria-hidden="true" />
                  Estado
                </dt>
                <dd>
                  <span className={`pill ${player.active ? 'pill--positive' : 'pill--neutral'}`}>
                    <span className="status-dot" aria-hidden="true" />
                    {player.active ? 'Activo' : 'Inactivo'}
                  </span>
                </dd>
              </div>
              <div>
                <dt>
                  <Shield size={16} aria-hidden="true" />
                  {player.currentTeams.length > 1 ? 'Equipos actuales' : 'Equipo actual'}
                </dt>
                <dd>
                  {player.currentTeams.length === 0 ? (
                    <span className="dash">Sin equipo</span>
                  ) : (
                    <span className="facts__teams">
                      {player.currentTeams.map((item) => (
                        <span key={item.id} className="role-cell">
                          <TeamMonogram team={item} size="sm" />
                          <span className="facts__strong">{item.name}</span>
                        </span>
                      ))}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {(canUpdate || canDelete) && (
            <div className="detail-cols__actions">
              {canUpdate && (
                <div className="detail__actions">
                  <button
                    type="button"
                    className="button button--tint button--tint-blue"
                    disabled={busy}
                    onClick={() => onEdit(player)}
                  >
                    <Pencil size={16} aria-hidden="true" />
                    Editar
                  </button>
                  <button
                    type="button"
                    className={`button button--tint ${player.active ? 'button--tint-red' : 'button--tint-green'}`}
                    disabled={busy}
                    onClick={() => onToggleActive(player)}
                  >
                    {player.active ? (
                      <UserRoundX size={16} aria-hidden="true" />
                    ) : (
                      <UserRoundCheck size={16} aria-hidden="true" />
                    )}
                    {player.active ? 'Desactivar' : 'Activar'}
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
                    onClick={() => onDelete(player)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Eliminar jugador
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
