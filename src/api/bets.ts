import { request } from './client'
import type { Match, MatchStatus } from './matches'
import type { TeamSummary } from './teams'
import type { TournamentSummary } from './tournaments'

// Rutas de /api/deportiva/bets y /betting (ms_torneos_deportiva, HU-GC-11). El aficionado sale del
// token: cada uno ve y cambia solo las suyas. El administrador ve las de un partido.

export type BetSelection = 'LOCAL' | 'EMPATE' | 'VISITANTE' // empate, solo en fase de grupos

// Solo PENDIENTE cambia; los demás son finales.
export type BetStatus = 'PENDIENTE' | 'GANADA' | 'PERDIDA' | 'ANULADA' | 'CANCELADA'

export interface BetMatch {
  id: number
  tournament: TournamentSummary
  homeTeam: TeamSummary
  awayTeam: TeamSummary
  scheduledAt: string // "AAAA-MM-DDTHH:mm", hora local
  status: MatchStatus
}

export interface Bet {
  id: number
  fan: { id: number; email: string }
  match: BetMatch
  selection: BetSelection
  amount: number // pesos
  odds: number // la del momento de apostar: no cambia
  potentialPayout: number // valor × cuota
  status: BetStatus
  payout: number | null // pagado (ganada), 0 (perdida) o devuelto (anulada o cancelada); null si pendiente
  settledAt: string | null
  paymentMethod: { id: number; name: string; alias: string | null; lastFour: string | null; phone: string | null }
  createdAt: string
}

// Lo que se puede cambiar antes del partido: el valor y el método de pago (la selección no).
export interface BetChange {
  amount: number
  fanPaymentMethodId: number
}

// Los mismos límites que valida el backend (MIN_BET_AMOUNT y MAX_BET_AMOUNT).
export const MIN_BET_AMOUNT = 1000
export const MAX_BET_AMOUNT = 5_000_000

// Los partidos que hoy reciben apuestas, con sus cuotas (match.betting).
export function findBettingMatches(): Promise<Match[]> {
  return request<Match[]>('/deportiva/betting/matches')
}

// Las mías, de la más reciente a la más antigua.
export function findMyBets(): Promise<Bet[]> {
  return request<Bet[]>('/deportiva/bets')
}

// La cuota se toma del partido en ese momento y queda fija.
export function createBet(matchId: number, selection: BetSelection, change: BetChange): Promise<Bet> {
  return request<Bet>('/deportiva/bets', { method: 'POST', body: JSON.stringify({ matchId, selection, ...change }) })
}

// Solo pendiente y antes de que empiece el partido.
export function updateBet(id: number, change: BetChange): Promise<Bet> {
  return request<Bet>(`/deportiva/bets/${id}`, { method: 'PUT', body: JSON.stringify(change) })
}

// Antes de que empiece el partido: se devuelve lo apostado.
export function cancelBet(id: number): Promise<Bet> {
  return request<Bet>(`/deportiva/bets/${id}/cancel`, { method: 'PATCH' })
}

// Administrador: las apuestas de un partido, en el orden en que se hicieron.
export function findBetsByMatch(matchId: number): Promise<Bet[]> {
  return request<Bet[]>(`/deportiva/bets/matches/${matchId}`)
}
