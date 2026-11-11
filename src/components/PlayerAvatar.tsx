import { UserRound } from 'lucide-react'
import type { CSSProperties } from 'react'
import { hueFor } from '../utils/hue'
import './PlayerAvatar.css'

interface PlayerAvatarProps {
  player: { id: number; firstName: string; lastName: string; photo?: string | null }
  size?: 'sm' | 'md' | 'lg' | 'card'
}

// Cómo se ve un jugador en todas las pantallas: su foto o, si no tiene, la inicial de su nombre y la
// de su apellido sobre un tono fijo por id. "card" es el retrato cuadrado del detalle.
export function PlayerAvatar({ player, size = 'md' }: PlayerAvatarProps) {
  const initials = `${player.firstName.trim().charAt(0)}${player.lastName.trim().charAt(0)}`.toUpperCase()
  return (
    <span
      className={`player-avatar player-avatar--${size}`}
      style={{ '--hue': hueFor(player.id) } as CSSProperties}
      aria-hidden="true"
    >
      {player.photo ? (
        <img src={player.photo} alt="" />
      ) : (
        // Sin nombre todavía (formulario nuevo): una silueta.
        initials || <UserRound size={size === 'sm' ? 16 : 24} />
      )}
    </span>
  )
}
