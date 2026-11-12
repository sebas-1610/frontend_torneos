import { useEffect, useSyncExternalStore, type CSSProperties } from 'react'
import { knownShield, loadTeamShields, subscribeToShields } from '../api/teams'
import { RESOURCES, useAccess } from '../auth/access'
import { hueFor } from '../utils/hue'
import { initials } from '../utils/initials'

interface TeamMonogramProps {
  // Un equipo completo trae su escudo (string o null). Uno de paso (el equipo actual de un jugador,
  // los equipos de un deporte...) no lo trae: se busca entre los equipos ya cargados.
  team: { id: number; name: string; shield?: string | null }
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

// Cómo se ve un equipo en todas las pantallas: su escudo o, si no tiene, sus iniciales en un
// círculo con un tono fijo por id.
export function TeamMonogram({ team, size = 'md' }: TeamMonogramProps) {
  const { can } = useAccess()
  const remembered = useSyncExternalStore(subscribeToShields, () => knownShield(team.id))
  const shield = team.shield !== undefined ? team.shield : remembered
  const canListTeams = can(RESOURCES.teams, 'LIST')

  // Si aún no se sabe si tiene escudo, se piden los equipos una vez (una sola petición para todos).
  useEffect(() => {
    if (shield === undefined && canListTeams) loadTeamShields()
  }, [shield, canListTeams])

  if (shield) {
    return (
      <span className={`team-shield team-shield--${size}`} aria-hidden="true">
        <img src={shield} alt="" />
      </span>
    )
  }
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
