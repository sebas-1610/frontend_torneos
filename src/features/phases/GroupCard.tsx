import { Pencil, Trash2, UserMinus, UserPlus } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { Group } from '../../api/groups'
import type { TeamSummary } from '../../api/teams'
import { RowAction } from '../../components/ListView'
import { TeamMonogram } from '../../components/TeamMonogram'
import { plural } from '../../utils/plural'
import { groupMark } from './phaseInfo'

interface GroupCardProps {
  group: Group
  index: number // para la entrada en cascada
  busy: boolean
  busyTeamId: number | null // el equipo que se está sacando del grupo
  // Cada acción llega solo si la sesión puede hacerla (y si el torneo lo permite).
  onRename?: () => void
  onDelete?: () => void
  onAssign?: () => void
  onRemoveTeam?: (team: TeamSummary) => void
}

// Un grupo de la fase (HU-GC-04): su letra, cuántos equipos tiene, sus equipos y la acción para
// sumarle más.
export function GroupCard({ group, index, busy, busyTeamId, onRename, onDelete, onAssign, onRemoveTeam }: GroupCardProps) {
  return (
    <li className="group-card" style={{ '--i': index } as CSSProperties}>
      <div className="group-card__head">
        <span className="group-card__mark" aria-hidden="true">
          {groupMark(group.name)}
        </span>
        <span className="group-card__title">
          <span className="group-card__name">{group.name}</span>
          <span className="group-card__count">{plural(group.teamsCount, 'equipo', 'equipos')}</span>
        </span>
        {(onRename || onDelete) && (
          <span className="row-actions">
            {onRename && (
              <RowAction icon={Pencil} title="Editar grupo" label={`Editar ${group.name}`} disabled={busy} onClick={onRename} />
            )}
            {onDelete && (
              <RowAction
                icon={Trash2}
                tone="red"
                title="Eliminar grupo"
                label={`Eliminar ${group.name}`}
                disabled={busy}
                onClick={onDelete}
              />
            )}
          </span>
        )}
      </div>

      {group.teams.length === 0 ? (
        <p className="detail__empty group-card__empty">Todavía no tiene equipos.</p>
      ) : (
        <ul className="detail-list group-card__teams">
          {group.teams.map((team) => (
            <li key={team.id} className="detail-list__item">
              <TeamMonogram team={team} size="sm" />
              <span className="detail-list__name">
                {team.name}
                {!team.active && <span className="detail-list__detail">Equipo desactivado</span>}
              </span>
              {onRemoveTeam && (
                <button
                  type="button"
                  className="icon-button icon-button--small group-card__remove"
                  title="Sacar del grupo"
                  aria-label={busyTeamId === team.id ? `Sacando a ${team.name}…` : `Sacar a ${team.name} de ${group.name}`}
                  disabled={busy}
                  onClick={() => onRemoveTeam(team)}
                >
                  <UserMinus size={16} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {onAssign && (
        <button
          type="button"
          className="button button--tint button--tint-green group-card__assign"
          disabled={busy}
          onClick={onAssign}
        >
          <UserPlus size={16} aria-hidden="true" />
          Asignar equipos
        </button>
      )}
    </li>
  )
}
