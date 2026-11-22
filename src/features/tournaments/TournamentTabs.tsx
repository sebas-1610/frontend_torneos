import { useEffect, useRef } from 'react'
import { canOpenPage, useAccess } from '../../auth/access'
import { screenHref, TOURNAMENT_SCREENS, type TournamentScreenId } from './tournamentScreens'
import './Tournaments.css'

interface TournamentTabsProps {
  tournamentId: number
  current: TournamentScreenId
}

// Pestañas entre las pantallas de un torneo (Inscripciones, Escenarios, Fases y grupos...): se pasa de
// una a otra con el mismo torneo, sin volver a Torneos. Solo salen las que la sesión puede abrir; con una
// sola, no hay pestañas.
export function TournamentTabs({ tournamentId, current }: TournamentTabsProps) {
  const { can } = useAccess()
  const navRef = useRef<HTMLElement>(null)
  const screens = TOURNAMENT_SCREENS.filter((screen) => canOpenPage(screen.page, can))

  // En el celular la tira se desliza de lado: la pestaña activa se centra para que se vea al entrar.
  useEffect(() => {
    const nav = navRef.current
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return
    nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2
  }, [current])

  if (screens.length < 2) return null

  return (
    <nav ref={navRef} className="tournament-tabs" aria-label="Pantallas del torneo">
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
