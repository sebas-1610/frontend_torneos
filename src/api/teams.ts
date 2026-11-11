import { request } from './client'
import type { SportSummary } from './sports'

// Rutas de /api/deportiva/teams (ms_torneos_deportiva, HU-GD-02).

// Lo mínimo de un equipo cuando llega dentro de otra respuesta (ej: los equipos de un deporte).
export interface TeamSummary {
  id: number
  name: string
  active: boolean
}

export interface Team extends TeamSummary {
  shortName: string | null // cómo se le dice en corto: "AT. Manizales"
  city: string
  description: string | null
  foundationDate: string | null // "AAAA-MM-DD"
  sports: SportSummary[] // deportes en los que participa, por nombre (HU-GD-03)
  playersCount: number // jugadores con contrato vigente hoy (HU-GD-05)
}

export interface TeamInput {
  name: string
  shortName: string | null
  city: string
  description: string | null
  foundationDate: string | null
}

export function findTeams(): Promise<Team[]> {
  return request<Team[]>('/deportiva/teams')
}

export function createTeam(input: TeamInput): Promise<Team> {
  return request<Team>('/deportiva/teams', { method: 'POST', body: JSON.stringify(input) })
}

// PUT reemplaza todo: un dato opcional que vaya en null (nombre corto, descripción, fecha) se borra.
export function updateTeam(id: number, input: TeamInput): Promise<Team> {
  return request<Team>(`/deportiva/teams/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

// Un equipo desactivado no recibe deportes ni contratos nuevos.
export function disableTeam(id: number): Promise<Team> {
  return request<Team>(`/deportiva/teams/${id}/disable`, { method: 'PATCH' })
}

export function enableTeam(id: number): Promise<Team> {
  return request<Team>(`/deportiva/teams/${id}/enable`, { method: 'PATCH' })
}

// Si tiene contratos o deportes asociados, el backend responde 400 con el motivo.
export function deleteTeam(id: number): Promise<void> {
  return request<void>(`/deportiva/teams/${id}`, { method: 'DELETE' })
}
