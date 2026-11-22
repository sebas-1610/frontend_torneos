import { useCallback } from 'react'
import { findTournamentsByVenue } from '../../api/tournamentVenues'
import type { Venue } from '../../api/venues'
import { DetailSection } from '../../components/DetailPanel'
import { TournamentBadge } from '../../components/TournamentBadge'
import { useLoadList } from '../../hooks/useLoadList'
import { STATUSES } from '../tournaments/tournamentInfo'

interface VenueTournamentsProps {
  venue: Venue
  canOpenTournaments: boolean // cada torneo lleva a su detalle en Torneos
}

// Torneos a los que está asignado el escenario, los más recientes primero (HU-GE-02). Va en el detalle
// de Escenarios.
export function VenueTournaments({ venue, canOpenTournaments }: VenueTournamentsProps) {
  const fetchTournaments = useCallback(() => findTournamentsByVenue(venue.id), [venue.id])
  const { items: assignments, loading, loadError } = useLoadList(fetchTournaments)

  return (
    <DetailSection title="Torneos">
      {loading ? (
        <p className="detail__empty">Cargando torneos…</p>
      ) : loadError ? (
        <p className="detail__empty">No se pudieron cargar los torneos: {loadError}</p>
      ) : assignments.length === 0 ? (
        <p className="detail__empty">{venue.name} no está asignado a ningún torneo.</p>
      ) : (
        <ul className="chip-list">
          {assignments.map(({ tournament }) => {
            const content = (
              <>
                <TournamentBadge tournament={tournament} size="sm" />
                {tournament.name}
                <span className="chip__detail">
                  {tournament.active ? STATUSES[tournament.status].label : 'Inactivo'}
                </span>
              </>
            )
            return (
              <li key={tournament.id} className={`chip${tournament.active ? '' : ' is-inactive'}`}>
                {canOpenTournaments ? (
                  <a className="chip__link" href={`#torneos/${tournament.id}`}>
                    {content}
                  </a>
                ) : (
                  content
                )}
              </li>
            )
          })}
        </ul>
      )}
    </DetailSection>
  )
}
