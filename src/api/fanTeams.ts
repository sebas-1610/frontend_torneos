import { request } from './client'
import type { SportSummary } from './sports'

// Rutas de /api/deportiva/fan-teams (ms_torneos_deportiva, HU-GE-05): los equipos de interés del
// aficionado que hace la petición (sale del token). El administrador consulta los aficionados de un
// equipo.

// Un equipo como lo ve el aficionado, con sus deportes.
export interface FanTeam {
  id: number
  name: string
  shortName: string | null
  city: string
  active: boolean
  sports: SportSummary[]
}

// Uno de los equipos activos, diciendo si ya lo sigue.
export interface FollowableTeam extends FanTeam {
  followed: boolean
}

export interface FollowedTeam {
  team: FanTeam // si se desactivó después, sigue aquí con active en false
  since: string // "AAAA-MM-DDTHH:mm": desde cuándo lo sigue
}

export interface TeamFollower {
  fan: { id: number; email: string }
  since: string
}

// Los equipos activos, por nombre.
export function findFollowableTeams(): Promise<FollowableTeam[]> {
  return request<FollowableTeam[]>('/deportiva/fan-teams/teams')
}

// Los que sigo, por nombre.
export function findMyTeams(): Promise<FollowedTeam[]> {
  return request<FollowedTeam[]>('/deportiva/fan-teams')
}

// Todo o nada: si uno no se puede seguir (desactivado, ya lo sigue...), no se sigue ninguno y el
// mensaje dice cuál y por qué.
export function followTeams(teamIds: number[]): Promise<FollowedTeam[]> {
  return request<FollowedTeam[]>('/deportiva/fan-teams', { method: 'POST', body: JSON.stringify({ teamIds }) })
}

export function unfollowTeam(teamId: number): Promise<void> {
  return request<void>(`/deportiva/fan-teams/${teamId}`, { method: 'DELETE' })
}

// Administrador: los aficionados que siguen a un equipo, del más antiguo al más reciente.
export function findTeamFollowers(teamId: number): Promise<TeamFollower[]> {
  return request<TeamFollower[]>(`/deportiva/fan-teams/teams/${teamId}/fans`)
}
