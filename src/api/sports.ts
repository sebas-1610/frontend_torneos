import { request } from './client'

// Rutas de /api/deportiva/sports (ms_torneos_deportiva, HU-GD-01). El proxy de Vite manda
// /api/deportiva/... al puerto 8182.

export interface SportSummary {
  id: number
  name: string
  active: boolean
}

export interface Sport {
  id: number
  name: string
  description: string | null
  active: boolean
  parent: SportSummary | null // null: deporte principal
  subSports: SportSummary[]
  teamsCount: number // cuántos equipos participan en él (HU-GD-03)
}

export interface SportInput {
  name: string
  description: string | null
  parentId: number | null
}

export function findSports(): Promise<Sport[]> {
  return request<Sport[]>('/deportiva/sports')
}

export function createSport(input: SportInput): Promise<Sport> {
  return request<Sport>('/deportiva/sports', { method: 'POST', body: JSON.stringify(input) })
}

// PUT reemplaza todo: sin descripción se borra la que tenía y sin parentId pasa a ser principal.
export function updateSport(id: number, input: SportInput): Promise<Sport> {
  return request<Sport>(`/deportiva/sports/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

// Un deporte desactivado no recibe equipos nuevos ni puede ser padre de otro.
export function disableSport(id: number): Promise<Sport> {
  return request<Sport>(`/deportiva/sports/${id}/disable`, { method: 'PATCH' })
}

export function enableSport(id: number): Promise<Sport> {
  return request<Sport>(`/deportiva/sports/${id}/enable`, { method: 'PATCH' })
}

// Si tiene subdeportes o equipos, el backend responde 400 con el motivo y sugiere desactivarlo.
export function deleteSport(id: number): Promise<void> {
  return request<void>(`/deportiva/sports/${id}`, { method: 'DELETE' })
}
