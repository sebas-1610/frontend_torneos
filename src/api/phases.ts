import { request } from './client'
import type { TournamentSummary } from './tournaments'

// Rutas de /api/deportiva/phases (HU-GC-03 y HU-GC-05): las fases de grupos y las finales usan las
// mismas rutas; el campo "type" dice cuál es cuál.

export type PhaseType = 'GRUPOS' | 'FINAL'

// Lo mínimo de una fase cuando llega dentro de otra respuesta (ej: la fase de un grupo).
export interface PhaseSummary {
  id: number
  name: string
  type: PhaseType
  order: number // 1 = la primera que se juega
}

// Los campos de un tipo llegan en null en las fases del otro tipo.
export interface Phase extends PhaseSummary {
  tournament: TournamentSummary
  qualifiersPerGroup: number | null // solo fase de grupos: cuántos pasan de cada grupo
  groupsCount: number | null // solo fase de grupos
  teamsCount: number | null // solo fase final: 2, 4, 8, 16, 32 o 64
}

export interface PhaseInput {
  type: PhaseType
  name: string
  qualifiersPerGroup: number | null // fase de grupos; null = 2
  teamsCount: number | null // fase final
}

// Fases de un torneo, en el orden en que se juegan.
export function findPhasesByTournament(tournamentId: number): Promise<Phase[]> {
  return request<Phase[]>(`/deportiva/phases/tournaments/${tournamentId}`)
}

// La fase nueva queda de última en el orden del torneo.
export function createPhase(tournamentId: number, input: PhaseInput): Promise<Phase> {
  return request<Phase>('/deportiva/phases', { method: 'POST', body: JSON.stringify({ tournamentId, ...input }) })
}

// El tipo se envía para validar sus campos, pero no se puede cambiar (400). Con partidos, una fase
// final no cambia su número de equipos.
export function updatePhase(id: number, input: PhaseInput): Promise<Phase> {
  return request<Phase>(`/deportiva/phases/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

// Todas las fases del torneo, en el orden nuevo. Responde la lista ya ordenada.
export function reorderPhases(tournamentId: number, phaseIds: number[]): Promise<Phase[]> {
  return request<Phase[]>(`/deportiva/phases/tournaments/${tournamentId}/order`, {
    method: 'PUT',
    body: JSON.stringify({ phaseIds }),
  })
}

// 400 si tiene grupos o partidos. Las fases que iban después suben un lugar.
export function deletePhase(id: number): Promise<void> {
  return request<void>(`/deportiva/phases/${id}`, { method: 'DELETE' })
}
