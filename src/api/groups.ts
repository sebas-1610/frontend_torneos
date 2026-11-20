import { request } from './client'
import type { PhaseSummary } from './phases'
import type { TeamSummary } from './teams'
import type { TournamentSummary } from './tournaments'

// Rutas de /api/deportiva/groups (HU-GC-04): los grupos de una fase de grupos.

export interface Group {
  id: number
  name: string
  phase: PhaseSummary
  tournament: TournamentSummary
  teams: TeamSummary[] // por nombre
  teamsCount: number
}

// Grupos de una fase, por nombre, cada uno con sus equipos.
export function findGroupsByPhase(phaseId: number): Promise<Group[]> {
  return request<Group[]>(`/deportiva/groups/phases/${phaseId}`)
}

// Solo en una fase de grupos de un torneo activo; el nombre no se repite en la fase (409).
export function createGroup(phaseId: number, name: string): Promise<Group> {
  return request<Group>('/deportiva/groups', { method: 'POST', body: JSON.stringify({ phaseId, name }) })
}

// Solo el nombre: un grupo no cambia de fase.
export function updateGroup(id: number, name: string): Promise<Group> {
  return request<Group>(`/deportiva/groups/${id}`, { method: 'PUT', body: JSON.stringify({ name }) })
}

// Sus equipos salen del grupo, pero siguen inscritos. 400 si ya tienen partidos en la fase.
export function deleteGroup(id: number): Promise<void> {
  return request<void>(`/deportiva/groups/${id}`, { method: 'DELETE' })
}
