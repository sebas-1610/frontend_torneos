import { useMemo, useState } from 'react'

export interface SortState<K extends string> {
  key: K
  direction: 'asc' | 'desc'
}

// Lo que se compara de cada fila: texto, número o nada (null).
type SortValue = string | number | null

// Sin tildes ni mayúsculas, y "Equipo 2" antes que "Equipo 10".
const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true })

// Orden de una tabla al hacer clic en sus encabezados (SortHeader). Sin orden elegido, la lista queda
// como llegó del backend. Lo vacío va siempre al final.
// values dice qué se compara en cada columna; debe ser un objeto fijo, definido fuera del componente.
export function useSort<T, K extends string>(items: T[], values: Record<K, (item: T) => SortValue>) {
  const [sort, setSort] = useState<SortState<K> | null>(null)

  const sorted = useMemo(() => {
    if (!sort) return items
    const read = values[sort.key]
    const sign = sort.direction === 'asc' ? 1 : -1
    return [...items].sort((a, b) => {
      const left = read(a)
      const right = read(b)
      if (left === null || right === null) return left === right ? 0 : left === null ? 1 : -1
      if (typeof left === 'string' && typeof right === 'string') return sign * collator.compare(left, right)
      return sign * (Number(left) - Number(right))
    })
  }, [items, sort, values])

  // Primer clic: de menor a mayor. Otro clic en la misma columna: al revés.
  function toggleSort(key: K) {
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  }

  return { sorted, sort, toggleSort }
}
