import { request } from './client'
import type { TeamSummary } from './teams'

// Rutas de /api/deportiva/players (ms_torneos_deportiva, HU-GD-04).

export type DocumentType = 'CC' | 'TI' | 'CE' | 'PA'

export const DOCUMENT_TYPES: { key: DocumentType; label: string }[] = [
  { key: 'CC', label: 'Cédula de ciudadanía' },
  { key: 'TI', label: 'Tarjeta de identidad' },
  { key: 'CE', label: 'Cédula de extranjería' },
  { key: 'PA', label: 'Pasaporte' },
]

export type DominantFoot = 'DERECHO' | 'IZQUIERDO' | 'AMBIDIESTRO'

export const DOMINANT_FEET: { key: DominantFoot; label: string }[] = [
  { key: 'DERECHO', label: 'Derecho' },
  { key: 'IZQUIERDO', label: 'Izquierdo' },
  { key: 'AMBIDIESTRO', label: 'Ambidiestro' },
]

// Lo mínimo de un jugador cuando llega dentro de otra respuesta (ej: los jugadores de una habilidad).
// No trae la foto.
export interface PlayerSummary {
  id: number
  documentType: DocumentType
  documentNumber: string
  firstName: string
  lastName: string
  position: string | null
  active: boolean
}

export interface Player extends PlayerSummary {
  birthDate: string // "AAAA-MM-DD"
  nationality: string | null
  heightCm: number | null // estatura en centímetros: 180 es 1,80 m
  dominantFoot: DominantFoot | null
  photo: string | null // "data:image/jpeg;base64,...": sirve tal cual como src de un <img>
  currentTeams: TeamSummary[] // equipos con contrato vigente hoy (HU-GD-05); normalmente uno
}

export interface PlayerInput {
  documentType: DocumentType
  documentNumber: string
  firstName: string
  lastName: string
  birthDate: string
  position: string | null
  nationality: string | null
  heightCm: number | null
  dominantFoot: DominantFoot | null
  photo: string | null
}

export function findPlayers(): Promise<Player[]> {
  return request<Player[]>('/deportiva/players')
}

export function createPlayer(input: PlayerInput): Promise<Player> {
  return request<Player>('/deportiva/players', { method: 'POST', body: JSON.stringify(input) })
}

// PUT reemplaza todo: un dato opcional que vaya en null (posición, foto...) se borra.
export function updatePlayer(id: number, input: PlayerInput): Promise<Player> {
  return request<Player>(`/deportiva/players/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

// Un jugador desactivado no recibe contratos ni habilidades nuevas.
export function disablePlayer(id: number): Promise<Player> {
  return request<Player>(`/deportiva/players/${id}/disable`, { method: 'PATCH' })
}

export function enablePlayer(id: number): Promise<Player> {
  return request<Player>(`/deportiva/players/${id}/enable`, { method: 'PATCH' })
}

// Si tiene contratos o habilidades, el backend responde 400 con el motivo.
export function deletePlayer(id: number): Promise<void> {
  return request<void>(`/deportiva/players/${id}`, { method: 'DELETE' })
}
