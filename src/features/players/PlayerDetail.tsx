import {
  Activity,
  Cake,
  CalendarDays,
  Footprints,
  Globe,
  IdCard,
  Ruler,
  Shield,
  Shirt,
  Sparkles,
  UserRound,
  UserRoundCheck,
  UserRoundX,
} from 'lucide-react'
import type { CSSProperties, Ref } from 'react'
import { DOCUMENT_TYPES, DOMINANT_FEET, type Player } from '../../api/players'
import type { ActionError } from '../../components/ActionAlert'
import {
  DetailActions,
  DetailHero,
  DetailMain,
  DetailPanel,
  DetailSection,
  DetailSide,
} from '../../components/DetailPanel'
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
  canSeeSkills: boolean // puede abrir "Asignar habilidades"
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
  canSeeSkills,
  onEdit,
  onToggleActive,
  onDelete,
}: PlayerDetailProps) {
  if (!player) {
    return <DetailPanel ref={ref} label="Detalle del jugador" icon={UserRound} emptyMessage={emptyMessage} />
  }

  const name = fullNameOf(player)
  const age = ageFrom(player.birthDate)
  const documentLabel = DOCUMENT_TYPES.find((type) => type.key === player.documentType)?.label
  const foot = DOMINANT_FEET.find((option) => option.key === player.dominantFoot)?.label
  const code = player.position ? positionCode(player.position) : null
  const tagStyle = player.position ? ({ '--tag': positionColor(player.position) } as CSSProperties) : undefined
  const [team] = player.currentTeams

  return (
    <DetailPanel
      ref={ref}
      label="Detalle del jugador"
      icon={UserRound}
      titleId="player-detail-title"
      emptyMessage={null}
      error={error}
      onDismissError={onDismissError}
    >
      <DetailMain>
        {/* El foco de luz toma el tono de su equipo; sin equipo, el suyo. */}
        <DetailHero
          glow={`hsl(${hueFor(team?.id ?? player.id)} 65% 48%)`}
          visual={
            <span className="hero__portrait">
              <PlayerAvatar player={player} size="card" />
              {team && (
                <span className="hero__badge" title={team.name}>
                  <TeamMonogram team={team} size="md" />
                </span>
              )}
            </span>
          }
        >
          <h3 id="player-detail-title" className="hero__name">
            {name}
          </h3>
          {player.position ? (
            <p className="hero__role" style={tagStyle}>
              {player.position}
              {code && code !== player.position.toUpperCase() && ` (${code})`}
            </p>
          ) : (
            <p className="detail__meta">Sin posición registrada</p>
          )}
        </DetailHero>
        {!player.active && (
          <p className="detail__empty detail__note">No recibe contratos ni habilidades nuevas hasta que lo actives.</p>
        )}
      </DetailMain>

      <DetailSide>
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
                <span className="tag" title={player.position} style={tagStyle}>
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
            <dd>{player.heightCm ? `${(player.heightCm / 100).toFixed(2)} m` : <span className="dash">—</span>}</dd>
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

        {canSeeSkills && (
          <DetailSection
            title="Habilidades"
            action={
              <a className="button button--text detail__add" href={`#habilidades-jugadores/${player.id}`}>
                <Sparkles size={16} aria-hidden="true" />
                Gestionar
              </a>
            }
          >
            <p className="detail__empty">Sus habilidades, el nivel de cada una y su radar de capacidades.</p>
          </DetailSection>
        )}
      </DetailSide>

      <DetailActions
        noun="jugador"
        active={player.active}
        busy={busy}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onEdit={() => onEdit(player)}
        onToggleActive={() => onToggleActive(player)}
        onDelete={() => onDelete(player)}
        disableIcon={UserRoundX}
        enableIcon={UserRoundCheck}
      />
    </DetailPanel>
  )
}
