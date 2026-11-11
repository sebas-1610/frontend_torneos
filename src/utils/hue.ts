// Tonos pálidos de identidad para los monogramas (identidad, no dato): separados al menos 60° y
// lejos del violeta.
export const IDENTITY_HUES = [40, 100, 160, 210, 340]

// Tono fijo por id: el mismo deporte (o equipo) se ve igual en todas las pantallas.
export function hueFor(id: number): number {
  return IDENTITY_HUES[Math.abs(id) % IDENTITY_HUES.length]
}
