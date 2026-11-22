import { request } from './client'
import type { TournamentSummary } from './tournaments'
import type { VenueLocation } from './venues'

// Rutas de /api/deportiva/tournament-venues (ms_torneos_deportiva, HU-GE-02): en qué escenarios se
// juega cada torneo.

export interface TournamentVenue {
  id: number
  tournament: TournamentSummary
  venue: VenueLocation
}

// Los escenarios asignados a un torneo, por nombre.
export function findVenuesByTournament(tournamentId: number): Promise<TournamentVenue[]> {
  return request<TournamentVenue[]>(`/deportiva/tournament-venues/tournaments/${tournamentId}`)
}

// Los torneos a los que está asignado un escenario, los más recientes primero.
export function findTournamentsByVenue(venueId: number): Promise<TournamentVenue[]> {
  return request<TournamentVenue[]>(`/deportiva/tournament-venues/venues/${venueId}`)
}

// Asigna uno o varios escenarios. Es todo o nada: si uno no cumple (torneo desactivado, escenario no
// disponible, ya asignado...), no se asigna ninguno y el mensaje dice cuál y por qué.
export function assignVenues(tournamentId: number, venueIds: number[]): Promise<TournamentVenue[]> {
  return request<TournamentVenue[]>('/deportiva/tournament-venues', {
    method: 'POST',
    body: JSON.stringify({ tournamentId, venueIds }),
  })
}

// Retira solo la asignación: el escenario y el torneo siguen existiendo. 400 si el torneo tiene
// partidos programados o en juego en ese escenario.
export function withdrawVenue(tournamentId: number, venueId: number): Promise<void> {
  return request<void>(`/deportiva/tournament-venues/${tournamentId}/${venueId}`, { method: 'DELETE' })
}
