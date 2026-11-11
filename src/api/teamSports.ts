import { request } from './client'
import type { TeamSummary } from './teams'

// Rutas de /api/deportiva/team-sports (HU-GD-03): qué equipos participan en qué deportes.

// Equipos de un deporte, por nombre.
export function findTeamsBySport(sportId: number): Promise<TeamSummary[]> {
  return request<TeamSummary[]>(`/deportiva/team-sports/sports/${sportId}`)
}
