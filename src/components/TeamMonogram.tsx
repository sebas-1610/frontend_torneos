import type { CSSProperties } from 'react'
import { hueFor } from '../utils/hue'
import { initials } from '../utils/initials'

interface TeamMonogramProps {
  team: { id: number; name: string }
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

// Cómo se ve un equipo en todas las pantallas: sus iniciales en un círculo, con un tono fijo por id.
// Los equipos no tienen escudo; si algún día lo tienen, se cambia aquí y aparece en todas partes.
export function TeamMonogram({ team, size = 'md' }: TeamMonogramProps) {
  return (
    <span
      className={`monogram monogram--round monogram--${size}`}
      style={{ '--hue': hueFor(team.id) } as CSSProperties}
      aria-hidden="true"
    >
      {initials(team.name)}
    </span>
  )
}
