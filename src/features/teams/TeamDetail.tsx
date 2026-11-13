import { CalendarDays, Info, Link2, MapPin, Tag, Trophy, Users } from 'lucide-react'
import type { Ref } from 'react'
import type { Sport } from '../../api/sports'
import type { Team } from '../../api/teams'
import type { ActionError } from '../../components/ActionAlert'
import {
  DetailActions,
  DetailHero,
  DetailMain,
  DetailPanel,
  DetailSection,
  DetailSide,
  StatTile,
  StatTiles,
} from '../../components/DetailPanel'
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
  canSeeRoster: boolean // puede abrir "Plantilla"
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
  canSeeRoster,
  onEdit,
  onToggleActive,
  onDelete,
}: TeamDetailProps) {
  if (!team) {
    return <DetailPanel ref={ref} label="Detalle del equipo" icon={Info} emptyMessage={emptyMessage} />
  }

  const players = team.playersCount
  return (
    <DetailPanel
      ref={ref}
      label="Detalle del equipo"
      icon={Info}
      titleId="team-detail-title"
      emptyMessage={null}
      error={error}
      onDismissError={onDismissError}
    >
      <DetailMain>
        <DetailHero glow={`hsl(${hueFor(team.id)} 65% 48%)`} visual={<TeamMonogram team={team} size="xl" />}>
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
        </DetailHero>

        <StatTiles>
          <StatTile
            icon={Trophy}
            tone="--tone-green"
            value={team.sports.length}
            label={team.sports.length === 1 ? 'Deporte asociado' : 'Deportes asociados'}
          />
          <StatTile
            icon={Users}
            tone="--tone-blue"
            value={players}
            label={players === 1 ? 'Jugador actual' : 'Jugadores actuales'}
          />
        </StatTiles>
        {!team.active && (
          <p className="detail__empty detail__note">No recibe deportes ni jugadores nuevos hasta que lo actives.</p>
        )}
      </DetailMain>

      <DetailSide>
        <DetailSection title="Descripción">
          <p className="detail-section__text">{team.description ?? 'Sin descripción.'}</p>
        </DetailSection>

        <DetailSection
          title="Deportes asociados"
          action={
            canAssociate && (
              <a className="button button--text detail__add" href={`#equipos-deportes/${team.id}`}>
                <Link2 size={16} aria-hidden="true" />
                Asociar
              </a>
            )
          }
        >
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
        </DetailSection>

        <DetailSection
          title="Plantilla"
          action={
            canSeeRoster && (
              <a className="button button--text detail__add" href={`#equipos-plantilla/${team.id}`}>
                <Users size={16} aria-hidden="true" />
                Gestionar
              </a>
            )
          }
        >
          <p className="detail__empty">
            {players === 0
              ? `${team.name} no tiene jugadores con contrato vigente.`
              : players === 1
                ? '1 jugador con contrato vigente.'
                : `${players} jugadores con contrato vigente.`}
          </p>
        </DetailSection>
      </DetailSide>

      <DetailActions
        noun="equipo"
        active={team.active}
        busy={busy}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onEdit={() => onEdit(team)}
        onToggleActive={() => onToggleActive(team)}
        onDelete={() => onDelete(team)}
      />
    </DetailPanel>
  )
}
