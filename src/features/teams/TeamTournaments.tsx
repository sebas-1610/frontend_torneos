import { useCallback } from 'react'
import { findRegistrationsByTeam } from '../../api/tournamentTeams'
import type { Team } from '../../api/teams'
import { DetailSection } from '../../components/DetailPanel'
import { TournamentBadge } from '../../components/TournamentBadge'
import { useLoadList } from '../../hooks/useLoadList'
import { STATUSES } from '../tournaments/tournamentInfo'

interface TeamTournamentsProps {
  team: Team
  canOpenTournaments: boolean // cada torneo lleva a su detalle en Torneos
}

// Torneos en los que está inscrito el equipo, los más recientes primero (HU-GC-02: consultar los
// torneos de un equipo). Va en el detalle de Equipos.
export function TeamTournaments({ team, canOpenTournaments }: TeamTournamentsProps) {
  const fetchRegistrations = useCallback(() => findRegistrationsByTeam(team.id), [team.id])
  const { items: registrations, loading, loadError } = useLoadList(fetchRegistrations)

  return (
    <DetailSection title="Torneos">
      {loading ? (
        <p className="detail__empty">Cargando torneos…</p>
      ) : loadError ? (
        <p className="detail__empty">No se pudieron cargar los torneos: {loadError}</p>
      ) : registrations.length === 0 ? (
        <p className="detail__empty">{team.name} no está inscrito en ningún torneo.</p>
      ) : (
        <ul className="chip-list">
          {registrations.map(({ tournament }) => {
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
