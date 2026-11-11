import { request } from './client'

// Rutas de /api/deportiva/skills (ms_torneos_deportiva, HU-GD-06).

export type SkillCategory = 'FISICA' | 'TECNICA' | 'TACTICA' | 'MENTAL'

// Como llega dentro de las habilidades de un jugador y de su perfil (HU-GD-07 y 08).
export interface SkillSummary {
  id: number
  name: string
  description: string | null
  category: SkillCategory
  active: boolean
}

// El catálogo trae además a cuántos jugadores está asignada.
export interface Skill extends SkillSummary {
  playersCount: number
}

export interface SkillInput {
  name: string
  category: SkillCategory
  description: string | null
}

export function findSkills(): Promise<Skill[]> {
  return request<Skill[]>('/deportiva/skills')
}

export function createSkill(input: SkillInput): Promise<Skill> {
  return request<Skill>('/deportiva/skills', { method: 'POST', body: JSON.stringify(input) })
}

// PUT reemplaza todo: sin descripción se borra la que tenía.
export function updateSkill(id: number, input: SkillInput): Promise<Skill> {
  return request<Skill>(`/deportiva/skills/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

// Desactivada no se puede asignar a más jugadores; los que ya la tienen la conservan.
export function disableSkill(id: number): Promise<Skill> {
  return request<Skill>(`/deportiva/skills/${id}/disable`, { method: 'PATCH' })
}

export function enableSkill(id: number): Promise<Skill> {
  return request<Skill>(`/deportiva/skills/${id}/enable`, { method: 'PATCH' })
}

// Si está asignada a jugadores, el backend responde 400 con a cuántos.
export function deleteSkill(id: number): Promise<void> {
  return request<void>(`/deportiva/skills/${id}`, { method: 'DELETE' })
}
