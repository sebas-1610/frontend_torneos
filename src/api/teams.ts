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

// ---------- Escudos ya conocidos ----------
// Las respuestas que traen un equipo de paso (el equipo actual de un jugador, los equipos de un
// deporte...) no traen su escudo, para no repetirlo en cada fila. TeamMonogram lo busca aquí: se
// llena con cada lista o equipo que llega del backend.

const shields = new Map<number, string | null>()
const listeners = new Set<() => void>()
let shieldsLoad: Promise<unknown> | null = null // la lista completa ya se pidió (o se está pidiendo)

function rememberShields(teams: Pick<Team, 'id' | 'shield'>[], complete: boolean) {
  if (complete) shields.clear()
  for (const team of teams) shields.set(team.id, team.shield)
  if (complete) shieldsLoad ??= Promise.resolve()
  listeners.forEach((listener) => listener())
}

function remember(team: Team): Team {
  rememberShields([team], false)
  return team
}

// undefined: todavía no se sabe; null: el equipo no tiene escudo.
export function knownShield(teamId: number): string | null | undefined {
  if (shields.has(teamId)) return shields.get(teamId)
  // Con la lista completa ya cargada, un equipo que no está en ella no tiene escudo que mostrar.
  return shieldsLoad ? null : undefined
}

export function subscribeToShields(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Pide la lista de equipos una sola vez, para los escudos de las pantallas que no la cargan.
export function loadTeamShields() {
  shieldsLoad ??= findTeams().catch(() => {
    // Sin escudos se muestran las iniciales; no hay nada que avisar.
    rememberShields([], true)
  })
}
