import { request } from './client'
import type { PlayerSummary } from './players'

// Rutas de /api/deportiva/player-skills (HU-GD-07): qué habilidades tiene cada jugador.

// Jugadores que tienen una habilidad, por apellidos y nombres.
export function findPlayersBySkill(skillId: number): Promise<PlayerSummary[]> {
  return request<PlayerSummary[]>(`/deportiva/player-skills/skills/${skillId}`)
}
