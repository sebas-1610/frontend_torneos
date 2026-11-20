import { request } from './client'
import { createImageMemory } from './imageMemory'
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
  shield: string | null // escudo: "data:image/webp;base64,..." (utils/image.ts) o null
  sports: SportSummary[] // deportes en los que participa, por nombre (HU-GD-03)
  playersCount: number // jugadores con contrato vigente hoy (HU-GD-05)
}

export interface TeamInput {
  name: string
  shortName: string | null
  city: string
  description: string | null
  foundationDate: string | null
  shield: string | null
}

export async function findTeams(): Promise<Team[]> {
  const teams = await request<Team[]>('/deportiva/teams')
  rememberShields(teams, true)
  return teams
}

export async function createTeam(input: TeamInput): Promise<Team> {
  return remember(await request<Team>('/deportiva/teams', { method: 'POST', body: JSON.stringify(input) }))
}

// PUT reemplaza todo: un dato opcional que vaya en null (nombre corto, descripción, fecha, escudo)
// se borra.
export async function updateTeam(id: number, input: TeamInput): Promise<Team> {
  return remember(await request<Team>(`/deportiva/teams/${id}`, { method: 'PUT', body: JSON.stringify(input) }))
}

// Un equipo desactivado no recibe deportes ni contratos nuevos.
export async function disableTeam(id: number): Promise<Team> {
  return remember(await request<Team>(`/deportiva/teams/${id}/disable`, { method: 'PATCH' }))
}

export async function enableTeam(id: number): Promise<Team> {
  return remember(await request<Team>(`/deportiva/teams/${id}/enable`, { method: 'PATCH' }))
}

// Si tiene contratos o deportes asociados, el backend responde 400 con el motivo.
export async function deleteTeam(id: number): Promise<void> {
  await request<void>(`/deportiva/teams/${id}`, { method: 'DELETE' })
  rememberShields([{ id, shield: null }], false)
}

// ---------- Escudos ya conocidos (imageMemory.ts) ----------
// TeamMonogram busca aquí el escudo de los equipos que llegan de paso, sin escudo.

const shieldMemory = createImageMemory(findTeams)

function rememberShields(teams: Pick<Team, 'id' | 'shield'>[], complete: boolean) {
  shieldMemory.remember(
    teams.map((team) => ({ id: team.id, image: team.shield })),
    complete,
  )
}

function remember(team: Team): Team {
  rememberShields([team], false)
  return team
}

// undefined: todavía no se sabe; null: el equipo no tiene escudo.
export const knownShield = shieldMemory.known
export const subscribeToShields = shieldMemory.subscribe
// Pide la lista de equipos una sola vez, para los escudos de las pantallas que no la cargan.
export const loadTeamShields = shieldMemory.load
