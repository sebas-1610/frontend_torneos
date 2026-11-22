import { request } from './client'
import type { PhaseSummary } from './phases'
import type { TeamSummary } from './teams'
import type { TournamentSummary } from './tournaments'
import type { VenueLocation } from './venues'

// Rutas de /api/deportiva/matches (HU-GC-06) y su resultado oficial (HU-GC-07).

// Lo cambia el administrador: Programado → En juego (iniciar) → Finalizado (resultado), o Cancelado.
export type MatchStatus = 'PROGRAMADO' | 'EN_JUEGO' | 'FINALIZADO' | 'CANCELADO'

export interface MatchResult {
  homeScore: number
  awayScore: number
  homePenalties: number | null // solo en una fase final que terminó empatada
  awayPenalties: number | null
}

// HU-GC-11: las cuotas del partido (las usa la etapa del aficionado).
export interface MatchBetting {
  homeOdds: number
  drawOdds: number | null
  awayOdds: number
  open: boolean
}

export interface Match {
  id: number
  tournament: TournamentSummary
  phase: PhaseSummary // phase.type dice si es de grupos o final
  group: { id: number; name: string } | null // calculado con los equipos; null en fases finales
  homeTeam: TeamSummary
  awayTeam: TeamSummary
  scheduledAt: string // hora local "AAAA-MM-DDTHH:mm"
  round: number | null // jornada, solo en fase de grupos (opcional)
  bracketPosition: number | null // llave, solo en fase final
  venue: VenueLocation | null // HU-GE-02: dónde se juega; null si todavía no tiene escenario
  status: MatchStatus
  result: MatchResult | null // null: sin resultado oficial
  liveScore: { home: number; away: number } // lo que suman las anotaciones
  betting: MatchBetting | null
}

export interface MatchInput {
  homeTeamId: number
  awayTeamId: number
  scheduledAt: string
  round: number | null
  bracketPosition: number | null
  // Uno de los escenarios del torneo, o null. PUT lo reemplaza: si no se envía, el partido queda sin
  // escenario.
  venueId: number | null
}

export interface ResultInput {
  homeScore: number
  awayScore: number
  homePenalties: number | null
  awayPenalties: number | null
}

// Todos los partidos del torneo, por fecha.
export function findMatchesByTournament(tournamentId: number): Promise<Match[]> {
  return request<Match[]>(`/deportiva/matches/tournaments/${tournamentId}`)
}

// Los de una fase, por fecha (las llaves de una fase final).
export function findMatchesByPhase(phaseId: number): Promise<Match[]> {
  return request<Match[]>(`/deportiva/matches/phases/${phaseId}`)
}

// Queda programado. En grupos, los dos equipos deben estar en el mismo grupo; en una fase final, la
// llave es obligatoria y cada equipo juega una vez. La fecha debe estar dentro del torneo.
export function createMatch(phaseId: number, input: MatchInput): Promise<Match> {
  return request<Match>('/deportiva/matches', { method: 'POST', body: JSON.stringify({ phaseId, ...input }) })
}

// Solo mientras está programado; la fase no cambia. Con apuestas o boletos, sus equipos no cambian; con
// la venta de entradas configurada, tampoco su escenario.
export function updateMatch(id: number, input: MatchInput): Promise<Match> {
  return request<Match>(`/deportiva/matches/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

// Programado → En juego.
export function startMatch(id: number): Promise<Match> {
  return request<Match>(`/deportiva/matches/${id}/start`, { method: 'PATCH' })
}

// Programado o en juego → Cancelado. Sus apuestas pendientes y sus boletos se anulan.
export function cancelMatch(id: number): Promise<Match> {
  return request<Match>(`/deportiva/matches/${id}/cancel`, { method: 'PATCH' })
}

// Solo programado o cancelado, sin anotaciones, apuestas ni boletos.
export function deleteMatch(id: number): Promise<void> {
  return request<void>(`/deportiva/matches/${id}`, { method: 'DELETE' })
}

// Registra el resultado oficial (en juego → finalizado) o lo corrige mientras ninguna fase posterior
// tenga partidos y sus apuestas no se hayan liquidado.
export function registerResult(id: number, input: ResultInput): Promise<Match> {
  return request<Match>(`/deportiva/matches/${id}/result`, { method: 'PUT', body: JSON.stringify(input) })
}

// HU-GC-11, lo del administrador: las cuotas del partido y si recibe apuestas. En fase de grupos la
// cuota del empate es obligatoria; en una fase final no lleva (null).
export interface MatchBettingInput {
  homeOdds: number
  drawOdds: number | null
  awayOdds: number
  open: boolean
}

// Solo mientras está programado. Las apuestas ya hechas conservan su cuota.
export function setMatchBetting(id: number, input: MatchBettingInput): Promise<Match> {
  return request<Match>(`/deportiva/matches/${id}/betting`, { method: 'PUT', body: JSON.stringify(input) })
}
