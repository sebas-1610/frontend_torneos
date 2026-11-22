import { request } from './client'
import type { VenueSummary } from './venues'

// Rutas de /api/deportiva/localities (ms_torneos_deportiva, HU-GE-03).

export interface Locality {
  id: number
  name: string
  capacity: number
  description: string | null
  active: boolean
  venue: VenueSummary // el escenario donde está: no cambia
}

export interface LocalityInput {
  name: string
  capacity: number
  description: string | null
}

// El tope que valida el backend (más que la tribuna más grande de un estadio).
export const MAX_LOCALITY_CAPACITY = 200_000

// Las localidades de un escenario, por nombre.
export function findLocalitiesByVenue(venueId: number): Promise<Locality[]> {
  return request<Locality[]>(`/deportiva/localities/venues/${venueId}`)
}

export function createLocality(venueId: number, input: LocalityInput): Promise<Locality> {
  return request<Locality>('/deportiva/localities', {
    method: 'POST',
    body: JSON.stringify({ venueId, ...input }),
  })
}

// El escenario no cambia al editar: la localidad es del escenario donde está.
export function updateLocality(id: number, input: LocalityInput): Promise<Locality> {
  return request<Locality>(`/deportiva/localities/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

export function disableLocality(id: number): Promise<Locality> {
  return request<Locality>(`/deportiva/localities/${id}/disable`, { method: 'PATCH' })
}

export function enableLocality(id: number): Promise<Locality> {
  return request<Locality>(`/deportiva/localities/${id}/enable`, { method: 'PATCH' })
}

// Con boletos o precios en la venta de entradas, el backend responde 400 con el motivo.
export async function deleteLocality(id: number): Promise<void> {
  await request<void>(`/deportiva/localities/${id}`, { method: 'DELETE' })
}
