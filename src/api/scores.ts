import { request } from './client'
import type { PlayerSummary } from './players'
import type { TeamSummary } from './teams'

// Rutas de /api/deportiva/scores (HU-GC-07): las anotaciones de un partido (goles, puntos...).

export interface Score {
  id: number
  matchId: number
  team: TeamSummary // el local o el visitante
  player: PlayerSummary
  minute: number // 1 a 200
  points: number // cuánto sumó: 1 por defecto
}

export interface ScoreInput {
  teamId: number
  playerId: number
  minute: number
  points: number
}

// Las de un partido, por minuto.
export function findScoresByMatch(matchId: number): Promise<Score[]> {
  return request<Score[]>(`/deportiva/scores/matches/${matchId}`)
}

// Solo con el partido en juego o finalizado. El jugador debe tener contrato con el equipo el día del
// partido; con resultado oficial, las anotaciones de un equipo no pueden pasar su marcador.
export function createScore(matchId: number, input: ScoreInput): Promise<Score> {
  return request<Score>('/deportiva/scores', { method: 'POST', body: JSON.stringify({ matchId, ...input }) })
}

export function updateScore(id: number, input: ScoreInput): Promise<Score> {
  return request<Score>(`/deportiva/scores/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

export function deleteScore(id: number): Promise<void> {
  return request<void>(`/deportiva/scores/${id}`, { method: 'DELETE' })
}
