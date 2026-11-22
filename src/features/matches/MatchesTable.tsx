import { Eye, MapPin, Pencil, Trash2 } from 'lucide-react'
import type { Match } from '../../api/matches'
import { RowAction, RowActions } from '../../components/ListView'
import { SortHeader } from '../../components/SortHeader'
import type { SortState } from '../../hooks/useSort'
import { matchSlot, matchTitle, matchWhen } from './matchInfo'
import { MatchStatusTag, MatchVersus } from './MatchVisuals'

export type MatchSortKey = 'date' | 'phase' | 'status'

interface MatchesTableProps {
  matches: Match[] // ya filtrados y ordenados
  selectedId: number | null
  sort: SortState<MatchSortKey> | null
  onSort: (key: MatchSortKey) => void
  onSelect: (matchId: number, reveal: boolean) => void
  busyId: number | null
  // La lista general (partidos de todos los torneos): la columna Fase dice también de qué torneo es.
  showTournament?: boolean
  // Cada acción llega solo si la sesión puede hacerla. Según el estado del partido, el botón sale
  // apagado y su título dice por qué.
  onEdit?: (match: Match) => void
  onDelete?: (match: Match) => void
}

// La tabla de Partidos (HU-GC-06): cuándo, quiénes frente a frente (con su marcador si ya lo hay) y en qué
// escenario (HU-GE-02), en qué fase (y torneo, en la lista general) y en qué estado.
export function MatchesTable({
  matches,
  selectedId,
  sort,
  onSort,
  onSelect,
  busyId,
  showTournament = false,
  onEdit,
  onDelete,
}: MatchesTableProps) {
  return (
    <div className="table-scroll">
      <table className="data-table data-table--select data-table--rows matches-table">
        <thead>
          <tr>
            <SortHeader label="Fecha" sortKey="date" sort={sort} onSort={onSort} className="data-table__optional" />
            <th>Partido</th>
            <SortHeader
              label={showTournament ? 'Torneo y fase' : 'Fase'}
              sortKey="phase"
              sort={sort}
              onSort={onSort}
              className="data-table__optional"
            />
            <SortHeader label="Estado" sortKey="status" sort={sort} onSort={onSort} className="data-table__optional" />
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => {
            const when = matchWhen(match.scheduledAt)
            const title = matchTitle(match)
            const isSelected = match.id === selectedId
            const busy = busyId === match.id
            const editable = match.status === 'PROGRAMADO'
            const removable = match.status === 'PROGRAMADO' || match.status === 'CANCELADO'
            const slot = matchSlot(match)
            const place = showTournament ? [match.phase.name, slot].filter(Boolean).join(' · ') : slot
            return (
              <tr
                key={match.id}
                className={`${isSelected ? 'is-selected' : ''}${match.status === 'CANCELADO' ? ' is-inactive' : ''}`}
                aria-current={isSelected ? 'true' : undefined}
                onClick={() => onSelect(match.id, false)}
              >
                <td className="data-table__optional">
                  <span className="cell-lines num">
                    <span>{when.date}</span>
                    <span className="cell-lines__detail">{when.time}</span>
                  </span>
                </td>
                <td className="data-table__name">
                  <MatchVersus match={match} />
                  {match.venue && (
                    <span className="matches-table__venue" title={`${match.venue.address}, ${match.venue.city}`}>
                      <MapPin size={12} aria-hidden="true" />
                      <span className="sr-only">Escenario: </span>
                      {match.venue.name}
                    </span>
                  )}
                  {/* En el celular las columnas Fecha y Fase se ocultan: la fecha (y el torneo, en la lista
                      general) va aquí, debajo de los equipos. */}
                  <span className="matches-table__when num">
                    {when.date} · {when.time}
                    {showTournament && ` · ${match.tournament.name}`}
                  </span>
                </td>
                <td className="data-table__optional">
                  <span className="cell-lines">
                    <span>{showTournament ? match.tournament.name : match.phase.name}</span>
                    {place && <span className="cell-lines__detail">{place}</span>}
                  </span>
                </td>
                <td className="data-table__optional">
                  <MatchStatusTag status={match.status} />
                </td>
                <RowActions>
                  <RowAction icon={Eye} title="Ver" label={`Ver ${title}`} onClick={() => onSelect(match.id, true)} />
                  {onEdit && (
                    <RowAction
                      icon={Pencil}
                      title={editable ? 'Editar' : 'Solo se edita un partido programado'}
                      label={`Editar ${title}`}
                      disabled={busy || !editable}
                      onClick={() => onEdit(match)}
                    />
                  )}
                  {onDelete && (
                    <RowAction
                      icon={Trash2}
                      tone="red"
                      title={removable ? 'Eliminar' : 'Solo se elimina un partido programado o cancelado'}
                      label={`Eliminar ${title}`}
                      disabled={busy || !removable}
                      onClick={() => onDelete(match)}
                    />
                  )}
                </RowActions>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
