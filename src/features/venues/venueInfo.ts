import type { Venue, VenueLocation } from '../../api/venues'

// Reglas de presentación de los escenarios (HU-GE-01), sin consultas.

// "Calle 10 # 5-20, Manizales".
export function placeOf(venue: Pick<Venue, 'address' | 'city'>): string {
  return `${venue.address}, ${venue.city}`
}

// Cómo se lee su estado: un escenario activo dentro de uno desactivado tampoco se puede usar.
export function statusOf(venue: Pick<Venue, 'active' | 'available'>): {
  label: string
  available: boolean
} {
  if (!venue.active) return { label: 'Inactivo', available: false }
  if (!venue.available) return { label: 'No disponible', available: false }
  return { label: 'Activo', available: true }
}

// Los principales por nombre, cada uno seguido de los de adentro: así se lee la lista sin ordenar.
export function treeOrder(venues: Venue[]): Venue[] {
  const byName = (a: Venue, b: Venue) => a.name.localeCompare(b.name, 'es')
  const children = new Map<number, Venue[]>()
  const mains: Venue[] = []
  for (const venue of venues) {
    if (venue.parent) {
      children.set(venue.parent.id, [...(children.get(venue.parent.id) ?? []), venue])
    } else {
      mains.push(venue)
    }
  }
  const ordered = mains.sort(byName).flatMap((main) => [main, ...(children.get(main.id) ?? []).sort(byName)])
  // Uno de adentro cuyo principal quedó fuera (por un filtro) va al final.
  const placed = new Set(ordered.map((venue) => venue.id))
  return [...ordered, ...venues.filter((venue) => !placed.has(venue.id)).sort(byName)]
}

// "1.250 puestos".
export function seats(count: number): string {
  return `${count.toLocaleString('es-CO')} ${count === 1 ? 'puesto' : 'puestos'}`
}

// Dónde queda un escenario que llega dentro de otra respuesta (el de un partido, los de un torneo):
// "Dentro de Coliseo Mayor · Manizales" o "Calle 10 # 5-20, Manizales".
export function locationOf(venue: Pick<VenueLocation, 'parentName' | 'address' | 'city'>): string {
  return venue.parentName ? `Dentro de ${venue.parentName} · ${venue.city}` : placeOf(venue)
}

// Su nombre con el que lo contiene, para distinguir canchas que se llaman igual: "Cancha 1 (Coliseo Mayor)".
export function venueName(venue: Pick<VenueLocation, 'name' | 'parentName'>): string {
  return venue.parentName ? `${venue.name} (${venue.parentName})` : venue.name
}
