import { request } from './client'
import { createImageMemory } from './imageMemory'
import type { SportSummary } from './sports'

// Rutas de /api/deportiva/tournaments (ms_torneos_deportiva, HU-GC-01).

export type TournamentCategory = 'MASCULINO' | 'FEMENINO' | 'MIXTO'

// No se guarda: el backend lo calcula con las fechas de hoy (tournament-status.ts).
export type TournamentStatus = 'POR_INICIAR' | 'EN_CURSO' | 'FINALIZADO'

// Lo mínimo de un torneo cuando llega dentro de otra respuesta (ej: los torneos de un equipo). No trae
// el logo: TournamentBadge lo busca entre los torneos ya cargados.
export interface TournamentSummary {
  id: number
  name: string
  status: TournamentStatus
  active: boolean
}

export interface Tournament extends TournamentSummary {
  sport: SportSummary
  category: TournamentCategory
  startDate: string // "AAAA-MM-DD"
  endDate: string // fecha estimada de fin
  registrationDeadline: string | null // último día para inscribir o retirar; null: hasta que empiece
  logo: string | null // "data:image/webp;base64,..." (utils/image.ts) o null: se ve el trofeo
  registrationOpen: boolean // si hoy se pueden inscribir o retirar equipos (HU-GC-02)
  teamsCount: number // equipos inscritos
}

export interface TournamentInput {
  name: string
  sportId: number
  category: TournamentCategory
  startDate: string
  endDate: string
  registrationDeadline: string | null
  logo: string | null
}

// Los más recientes primero (por fecha de inicio).
export async function findTournaments(): Promise<Tournament[]> {
  const tournaments = await request<Tournament[]>('/deportiva/tournaments')
  rememberLogos(tournaments, true)
  return tournaments
}

export async function createTournament(input: TournamentInput): Promise<Tournament> {
  return remember(await request<Tournament>('/deportiva/tournaments', { method: 'POST', body: JSON.stringify(input) }))
}

// PUT reemplaza todo: sin cierre de inscripciones o sin logo, se borra el que tenía. Con equipos
// inscritos, el deporte no se puede cambiar (400).
export async function updateTournament(id: number, input: TournamentInput): Promise<Tournament> {
  return remember(
    await request<Tournament>(`/deportiva/tournaments/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  )
}

// Un torneo desactivado no recibe inscripciones, fases, grupos ni partidos nuevos.
export async function disableTournament(id: number): Promise<Tournament> {
  return remember(await request<Tournament>(`/deportiva/tournaments/${id}/disable`, { method: 'PATCH' }))
}

export async function enableTournament(id: number): Promise<Tournament> {
  return remember(await request<Tournament>(`/deportiva/tournaments/${id}/enable`, { method: 'PATCH' }))
}

// Si tiene fases o equipos inscritos, el backend responde 400 con el motivo y sugiere desactivarlo.
export async function deleteTournament(id: number): Promise<void> {
  await request<void>(`/deportiva/tournaments/${id}`, { method: 'DELETE' })
  rememberLogos([{ id, logo: null }], false)
}

// ---------- Logos ya conocidos (imageMemory.ts) ----------
// TournamentBadge busca aquí el logo de los torneos que llegan de paso, sin logo.

const logoMemory = createImageMemory(findTournaments)

function rememberLogos(tournaments: Pick<Tournament, 'id' | 'logo'>[], complete: boolean) {
  logoMemory.remember(
    tournaments.map((tournament) => ({ id: tournament.id, image: tournament.logo })),
    complete,
  )
}

function remember(tournament: Tournament): Tournament {
  rememberLogos([tournament], false)
  return tournament
}

// undefined: todavía no se sabe; null: el torneo no tiene logo.
export const knownLogo = logoMemory.known
export const subscribeToLogos = logoMemory.subscribe
// Pide la lista de torneos una sola vez, para los logos de las pantallas que no la cargan.
export const loadTournamentLogos = logoMemory.load
