import { request } from './client'

// Rutas de /api/deportiva/venues (ms_torneos_deportiva, HU-GE-01).

// Lo mínimo de un escenario cuando llega dentro de otra respuesta (el que contiene a otro, uno de
// adentro, el de una localidad).
export interface VenueSummary {
  id: number
  name: string
  active: boolean
}

// Dónde queda un escenario, dentro de otra respuesta (el escenario de un partido, los de un torneo).
export interface VenueLocation extends VenueSummary {
  parentName: string | null // "Coliseo Mayor" si es una cancha de adentro; null si es principal
  address: string
  city: string
  available: boolean
}

// Una localidad dentro del escenario (HU-GE-03).
export interface VenueLocality {
  id: number
  name: string
  capacity: number
  active: boolean
}

export interface Venue extends VenueSummary {
  // Las suyas o, si está dentro de otro escenario, las de ese.
  address: string
  city: string
  description: string | null
  photo: string | null // "data:image/jpeg;base64,..." (utils/image.ts) o null
  available: boolean // activo y, si está dentro de otro, ese también
  parent: VenueSummary | null // el que lo contiene; null si es principal
  children: VenueSummary[] // los de adentro, por nombre
  localities: VenueLocality[] // por nombre
  capacity: number // suma de sus localidades activas
}

// Un escenario de adentro no lleva dirección ni ciudad: usa las del que lo contiene.
export interface VenueInput {
  name: string
  address: string | null
  city: string | null
  description: string | null
  photo: string | null
  parentId: number | null
}

export function findVenues(): Promise<Venue[]> {
  return request<Venue[]>('/deportiva/venues')
}

export function createVenue(input: VenueInput): Promise<Venue> {
  return request<Venue>('/deportiva/venues', { method: 'POST', body: JSON.stringify(input) })
}

// PUT reemplaza todo: un dato opcional que vaya en null (descripción, foto) se borra.
export function updateVenue(id: number, input: VenueInput): Promise<Venue> {
  return request<Venue>(`/deportiva/venues/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

// Desactivar uno principal deja sin usar también a los de adentro (available en false).
export function disableVenue(id: number): Promise<Venue> {
  return request<Venue>(`/deportiva/venues/${id}/disable`, { method: 'PATCH' })
}

export function enableVenue(id: number): Promise<Venue> {
  return request<Venue>(`/deportiva/venues/${id}/enable`, { method: 'PATCH' })
}

// Con escenarios adentro, localidades, torneos o partidos, el backend responde 400 con el motivo.
export async function deleteVenue(id: number): Promise<void> {
  await request<void>(`/deportiva/venues/${id}`, { method: 'DELETE' })
}
