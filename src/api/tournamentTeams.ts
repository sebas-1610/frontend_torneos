import { request } from './client'
import type { TeamSummary } from './teams'
import type { TournamentSummary } from './tournaments'

// Rutas de /api/deportiva/tournament-teams (HU-GC-02): qué equipos están inscritos en qué torneos.

export interface Registration {
  id: number
  tournament: TournamentSummary
  team: TeamSummary
  registeredAt: string // "AAAA-MM-DD": el día en que se inscribió
}

// Equipos inscritos en un torneo, por nombre.
export function findRegistrationsByTournament(tournamentId: number): Promise<Registration[]> {
  return request<Registration[]>(`/deportiva/tournament-teams/tournaments/${tournamentId}`)
}

// Torneos en los que está inscrito un equipo, los más recientes primero.
export function findRegistrationsByTeam(teamId: number): Promise<Registration[]> {
  return request<Registration[]>(`/deportiva/tournament-teams/teams/${teamId}`)
}

// Inscribe uno o varios equipos. Es todo o nada: si uno no cumple (desactivado, sin el deporte del
// torneo, ya inscrito...), no se inscribe ninguno y el mensaje dice cuál y por qué.
export function registerTeams(tournamentId: number, teamIds: number[]): Promise<Registration[]> {
  return request<Registration[]>('/deportiva/tournament-teams', {
    method: 'POST',
    body: JSON.stringify({ tournamentId, teamIds }),
  })
}

// Retira solo la inscripción: el equipo y el torneo siguen existiendo. 400 si las inscripciones
// están cerradas, si el equipo ya está en un grupo o si ya tiene partidos en el torneo.
export function withdrawTeam(tournamentId: number, teamId: number): Promise<void> {
  return request<void>(`/deportiva/tournament-teams/${tournamentId}/${teamId}`, { method: 'DELETE' })
}
