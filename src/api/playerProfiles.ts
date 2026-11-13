import { request } from './client'
import type { PlayerSkill } from './playerSkills'
import type { Player } from './players'
import type { ContractStatus } from './teamPlayers'
import type { TeamSummary } from './teams'

// Ruta de /api/deportiva/players/{id}/profile (HU-GD-08): todo lo del jugador en una sola respuesta.

// Un contrato visto desde el jugador: el equipo, las fechas y el estado (sin repetir al jugador).
export interface ProfileContract {
  id: number
  team: TeamSummary
  startDate: string // "AAAA-MM-DD"
  endDate: string
  retiredAt: string | null
  status: ContractStatus
}

export interface PlayerProfile {
  player: Player
  teams: ProfileContract[] // equipos con los que está asociado: contratos vigentes y por empezar
  teamHistory: ProfileContract[] // contratos finalizados y retirados
  teamsMessage: string | null // qué decir si no tiene equipos; null si sí tiene
  skills: PlayerSkill[] // sus habilidades, cada una con su nivel (1–100)
  skillsMessage: string | null // qué decir si no tiene habilidades; null si sí tiene
}

export function findPlayerProfile(playerId: number): Promise<PlayerProfile> {
  return request<PlayerProfile>(`/deportiva/players/${playerId}/profile`)
}
