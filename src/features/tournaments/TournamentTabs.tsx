import { canOpenPage, useAccess } from '../../auth/access'
import { screenHref, TOURNAMENT_SCREENS, type TournamentScreenId } from './tournamentScreens'
import './Tournaments.css'

interface TournamentTabsProps {
  tournamentId: number
  current: TournamentScreenId
}

// Pestañas entre las pantallas de un torneo (Inscripciones, Fases y grupos): se pasa de una a otra con
// el mismo torneo, sin volver a Torneos. Solo salen las que la sesión puede abrir; con una sola, no hay
// pestañas.
export function TournamentTabs({ tournamentId, current }: TournamentTabsProps) {
  const { can } = useAccess()
  const screens = TOURNAMENT_SCREENS.filter((screen) => canOpenPage(screen.page, can))
  if (screens.length < 2) return null

  return (
    <nav className="tournament-tabs" aria-label="Pantallas del torneo">
      {screens.map(({ page, label, icon: Icon }) => {
        const active = page === current
        return (
          <a
            key={page}
            className={`tournament-tabs__tab${active ? ' is-active' : ''}`}
            href={screenHref(page, tournamentId)}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </a>
        )
      })}
    </nav>
  )
}
