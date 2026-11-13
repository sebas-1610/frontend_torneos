import { request } from './client'
import type { PlayerSummary } from './players'
import type { SkillSummary } from './skills'

// Rutas de /api/deportiva/player-skills (HU-GD-07): qué habilidades tiene cada jugador y con qué nivel.

export const MIN_LEVEL = 1
export const MAX_LEVEL = 100
export const DEFAULT_LEVEL = 50 // el que pone el backend si no se envía

// Una habilidad vista desde el jugador: la habilidad y el nivel (1–100) que él tiene en ella.
export interface PlayerSkill extends SkillSummary {
  level: number
}

// Habilidades de un jugador, por nombre.
export function findSkillsByPlayer(playerId: number): Promise<PlayerSkill[]> {
  return request<PlayerSkill[]>(`/deportiva/player-skills/players/${playerId}`)
}

// Jugadores que tienen una habilidad, por apellidos y nombres.
export function findPlayersBySkill(skillId: number): Promise<PlayerSummary[]> {
  return request<PlayerSummary[]>(`/deportiva/player-skills/skills/${skillId}`)
}

// 409 si el jugador ya la tiene; 400 si el jugador o la habilidad están desactivados.
export function assignSkill(playerId: number, skillId: number, level: number): Promise<void> {
  return request<void>('/deportiva/player-skills', {
    method: 'POST',
    body: JSON.stringify({ playerId, skillId, level }),
  })
}

// Cambia solo el nivel: el jugador conserva la habilidad.
export function changeSkillLevel(playerId: number, skillId: number, level: number): Promise<void> {
  return request<void>(`/deportiva/player-skills/${playerId}/${skillId}`, {
    method: 'PATCH',
    body: JSON.stringify({ level }),
  })
}

// Retira solo la asignación: la habilidad sigue en el catálogo.
export function removeSkill(playerId: number, skillId: number): Promise<void> {
  return request<void>(`/deportiva/player-skills/${playerId}/${skillId}`, { method: 'DELETE' })
}

// Media general de un jugador: el promedio de los niveles de sus habilidades (0 si no tiene).
export function averageLevel(skills: PlayerSkill[]): number {
  if (skills.length === 0) return 0
  return Math.round(skills.reduce((sum, skill) => sum + skill.level, 0) / skills.length)
}
