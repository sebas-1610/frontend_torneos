import { request } from './client'
import type { SportSummary } from './sports'

// Rutas de /api/deportiva/tournaments (ms_torneos_deportiva, HU-GC-01).

export type TournamentCategory = 'MASCULINO' | 'FEMENINO' | 'MIXTO'

// No se guarda: el backend lo calcula con las fechas de hoy (tournament-status.ts).
export type TournamentStatus = 'POR_INICIAR' | 'EN_CURSO' | 'FINALIZADO'

// Lo mínimo de un torneo cuando llega dentro de otra respuesta (ej: los torneos de un equipo).
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
}

// Los más recientes primero (por fecha de inicio).
export function findTournaments(): Promise<Tournament[]> {
  return request<Tournament[]>('/deportiva/tournaments')
}

export function createTournament(input: TournamentInput): Promise<Tournament> {
  return request<Tournament>('/deportiva/tournaments', { method: 'POST', body: JSON.stringify(input) })
}

// PUT reemplaza todo: sin cierre de inscripciones, se borra el que tenía. Con equipos inscritos, el
// deporte no se puede cambiar (400).
export function updateTournament(id: number, input: TournamentInput): Promise<Tournament> {
  return request<Tournament>(`/deportiva/tournaments/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

// Un torneo desactivado no recibe inscripciones, fases, grupos ni partidos nuevos.
export function disableTournament(id: number): Promise<Tournament> {
  return request<Tournament>(`/deportiva/tournaments/${id}/disable`, { method: 'PATCH' })
}

export function enableTournament(id: number): Promise<Tournament> {
  return request<Tournament>(`/deportiva/tournaments/${id}/enable`, { method: 'PATCH' })
}

// Si tiene fases o equipos inscritos, el backend responde 400 con el motivo y sugiere desactivarlo.
export function deleteTournament(id: number): Promise<void> {
  return request<void>(`/deportiva/tournaments/${id}`, { method: 'DELETE' })
}
