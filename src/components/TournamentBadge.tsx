import { Trophy } from 'lucide-react'
import { useEffect, useSyncExternalStore, type CSSProperties } from 'react'
import { knownLogo, loadTournamentLogos, subscribeToLogos } from '../api/tournaments'
import { RESOURCES, useAccess } from '../auth/access'
import { hueFor } from '../utils/hue'

interface TournamentBadgeProps {
  // Un torneo completo trae su logo (string o null). Uno de paso (los torneos de un equipo...) no lo
  // trae: se busca entre los torneos ya cargados.
  tournament: { id: number; logo?: string | null }
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const ICON_SIZE = { sm: 14, md: 18, lg: 28, xl: 36 }

// Cómo se ve un torneo en todas las pantallas: su logo entero (como el escudo de un equipo, con las
// mismas medidas) o, si no tiene, un trofeo en un círculo con un tono fijo por id.
export function TournamentBadge({ tournament, size = 'md' }: TournamentBadgeProps) {
  const { can } = useAccess()
  const remembered = useSyncExternalStore(subscribeToLogos, () => knownLogo(tournament.id))
  const logo = tournament.logo !== undefined ? tournament.logo : remembered
  const canListTournaments = can(RESOURCES.tournaments, 'LIST')

  // Si aún no se sabe si tiene logo, se piden los torneos una vez (una sola petición para todos).
  useEffect(() => {
    if (logo === undefined && canListTournaments) loadTournamentLogos()
  }, [logo, canListTournaments])

  if (logo) {
    return (
      <span className={`team-shield team-shield--${size}`} aria-hidden="true">
        <img src={logo} alt="" />
      </span>
    )
  }
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
