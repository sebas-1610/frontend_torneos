import type { CSSProperties } from 'react'
import type { TournamentSummary } from '../../api/tournaments'
import { StatusPill } from '../../components/ListView'
import { STATUSES } from './tournamentInfo'

// Estado de un torneo: por iniciar, en curso o finalizado (sale de sus fechas). Si está desactivado,
// eso es lo que importa y se ve "Inactivo".
export function TournamentStatusTag({ tournament }: { tournament: Pick<TournamentSummary, 'status' | 'active'> }) {
  if (!tournament.active) return <StatusPill active={false} />
  const { label, tone } = STATUSES[tournament.status]
  return (
    <span className="tag" style={{ '--tag': tone } as CSSProperties}>
      {label}
    </span>
  )
}
