import { request } from './client'
import type { Group } from './groups'

// Rutas de /api/deportiva/group-teams (HU-GC-04): qué equipos están en qué grupo.

// Asigna uno o varios equipos al grupo y responde el grupo con todos sus equipos. Es todo o nada: si
// uno no cumple (desactivado, no inscrito, ya en otro grupo de la fase...), no entra ninguno.
export function assignTeamsToGroup(groupId: number, teamIds: number[]): Promise<Group> {
  return request<Group>('/deportiva/group-teams', { method: 'POST', body: JSON.stringify({ groupId, teamIds }) })
}

// Saca al equipo del grupo: sigue inscrito en el torneo. 400 si ya tiene partidos en la fase.
export function removeTeamFromGroup(groupId: number, teamId: number): Promise<void> {
  return request<void>(`/deportiva/group-teams/${groupId}/${teamId}`, { method: 'DELETE' })
}
