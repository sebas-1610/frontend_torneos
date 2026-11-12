import { UserRound } from 'lucide-react'
import type { CSSProperties } from 'react'
import { hueFor } from '../utils/hue'
import { initials } from '../utils/initials'
import './PlayerAvatar.css'

// Un jugador (nombres y apellidos aparte) o un usuario (nombre completo en un solo texto).
type Person = { id: number; photo?: string | null } & ({ firstName: string; lastName: string } | { name: string })

interface PlayerAvatarProps {
  player: Person
  size?: 'sm' | 'md' | 'lg' | 'card'
}

function initialsOf(person: Person): string {
  if ('name' in person) return initials(person.name.trim())
  return `${person.firstName.trim().charAt(0)}${person.lastName.trim().charAt(0)}`.toUpperCase()
}

// Cómo se ve un jugador (o un usuario, en su lista) en todas las pantallas: su foto o, si no tiene, la
// inicial de su nombre y la de su apellido sobre un tono fijo por id. "card" es el retrato cuadrado
// del detalle.
export function PlayerAvatar({ player, size = 'md' }: PlayerAvatarProps) {
  const letters = initialsOf(player)
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
        letters || <UserRound size={size === 'sm' ? 16 : 24} />
      )}
    </span>
  )
}
