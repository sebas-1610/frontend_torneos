import type { Sport } from '../../api/sports'

// Los deportes forman un árbol (HU-GD-01): Fútbol → Fútbol de salón → Futsal femenino.

export interface SportRow {
  sport: Sport
  depth: number // 0: deporte principal; 1: subdeporte; 2: subdeporte de un subdeporte...
}

// Orden de árbol: cada deporte seguido de sus subdeportes, todos por nombre (como los entrega el
// backend). El backend no deja crear ciclos, así que el recorrido siempre termina.
export function treeOrder(sports: Sport[]): SportRow[] {
  const children = new Map<number | null, Sport[]>()
  for (const sport of sports) {
    const parentId = sport.parent?.id ?? null
    children.set(parentId, [...(children.get(parentId) ?? []), sport])
  }

  const rows: SportRow[] = []
  const visit = (parentId: number | null, depth: number) => {
    for (const sport of children.get(parentId) ?? []) {
      rows.push({ sport, depth })
      visit(sport.id, depth + 1)
    }
  }
  visit(null, 0)
  return rows
}

// El deporte y todos los que cuelgan de él: ninguno puede ser su padre, porque sería un ciclo.
export function selfAndDescendants(sports: Sport[], id: number): Set<number> {
  const ids = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const sport of sports) {
      if (sport.parent && ids.has(sport.parent.id) && !ids.has(sport.id)) {
        ids.add(sport.id)
        grew = true
      }
    }
  }
  return ids
}

// "Fútbol › Fútbol de salón": la ruta desde el deporte principal, para el selector de padre.
export function sportPath(sports: Sport[], sport: Sport): string {
  const byId = new Map(sports.map((item) => [item.id, item]))
  const names = [sport.name]
  let parentId = sport.parent?.id ?? null
  while (parentId !== null && names.length < 20) {
    const parent = byId.get(parentId)
    if (!parent) break
    names.unshift(parent.name)
    parentId = parent.parent?.id ?? null
  }
  return names.join(' › ')
}
