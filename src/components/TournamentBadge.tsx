import { Trophy } from 'lucide-react'
import type { CSSProperties } from 'react'
import { hueFor } from '../utils/hue'

interface TournamentBadgeProps {
  tournament: { id: number }
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const ICON_SIZE = { sm: 14, md: 18, lg: 28, xl: 36 }

// Cómo se ve un torneo en todas las pantallas: un trofeo en un círculo con un tono fijo por id, como
// el de los equipos sin escudo (TeamMonogram). Los torneos no tienen logo.
export function TournamentBadge({ tournament, size = 'md' }: TournamentBadgeProps) {
  return (
    <span
      className={`monogram monogram--round monogram--${size}`}
      style={{ '--hue': hueFor(tournament.id) } as CSSProperties}
      aria-hidden="true"
    >
      <Trophy size={ICON_SIZE[size]} strokeWidth={1.6} />
    </span>
  )
}
