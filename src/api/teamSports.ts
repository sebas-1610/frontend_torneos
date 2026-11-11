import { request } from './client'
import type { TeamSummary } from './teams'

// Rutas de /api/deportiva/team-sports (HU-GD-03): qué equipos participan en qué deportes.
// Los deportes de un equipo ya llegan en GET /teams (campo sports), así que no hace falta pedirlos aquí.

// Equipos de un deporte, por nombre.
export function findTeamsBySport(sportId: number): Promise<TeamSummary[]> {
  return request<TeamSummary[]>(`/deportiva/team-sports/sports/${sportId}`)
}

// 409 si ya estaban asociados; 400 si el equipo o el deporte están desactivados.
export function associateSport(teamId: number, sportId: number): Promise<void> {
  return request<void>('/deportiva/team-sports', { method: 'POST', body: JSON.stringify({ teamId, sportId }) })
}

// Retira solo la asociación: el equipo y el deporte siguen existiendo.
export function dissociateSport(teamId: number, sportId: number): Promise<void> {
  return request<void>(`/deportiva/team-sports/${teamId}/${sportId}`, { method: 'DELETE' })
}
