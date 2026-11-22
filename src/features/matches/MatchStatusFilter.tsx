import type { MatchStatus } from '../../api/matches'

interface MatchStatusFilterProps {
  value: MatchStatus | ''
  onChange: (status: MatchStatus | '') => void
}

// El filtro de estado de las listas de partidos (la de un torneo y la general). '' = todos.
export function MatchStatusFilter({ value, onChange }: MatchStatusFilterProps) {
  return (
    <select aria-label="Filtrar por estado" value={value} onChange={(e) => onChange(e.target.value as MatchStatus | '')}>
      <option value="">Todos los estados</option>
      <option value="EN_JUEGO">En juego</option>
      <option value="PROGRAMADO">Programados</option>
      <option value="FINALIZADO">Finalizados</option>
      <option value="CANCELADO">Cancelados</option>
    </select>
  )
}
