// Imágenes que las respuestas "de paso" no traen, para no repetirlas en cada fila: el escudo de un
// equipo (el equipo actual de un jugador, los equipos de un deporte...) y el logo de un torneo (los
// torneos de un equipo...). Quien las dibuja (TeamMonogram, TournamentBadge) las busca aquí; se llena
// con cada lista o elemento completo que llega del backend.

export interface ImageMemory {
  // complete: es la lista entera (lo que no esté en ella no tiene imagen).
  remember: (items: { id: number; image: string | null }[], complete: boolean) => void
  // undefined: todavía no se sabe; null: no tiene imagen.
  known: (id: number) => string | null | undefined
  subscribe: (listener: () => void) => () => void
  // Pide la lista completa una sola vez, para las pantallas que no la cargan.
  load: () => void
}

export function createImageMemory(loadAll: () => Promise<unknown>): ImageMemory {
  const images = new Map<number, string | null>()
  const listeners = new Set<() => void>()
  let loaded: Promise<unknown> | null = null // la lista completa ya se pidió (o se está pidiendo)

  function remember(items: { id: number; image: string | null }[], complete: boolean) {
    if (complete) images.clear()
    for (const item of items) images.set(item.id, item.image)
    if (complete) loaded ??= Promise.resolve()
    listeners.forEach((listener) => listener())
  }

  return {
    remember,
    known(id) {
      if (images.has(id)) return images.get(id)
      // Con la lista completa ya pedida, uno que no está en ella no tiene imagen que mostrar.
      return loaded ? null : undefined
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    load() {
      loaded ??= loadAll().catch(() => {
        // Sin imágenes se muestran las iniciales o el trofeo; no hay nada que avisar.
        remember([], true)
      })
    },
  }
}
