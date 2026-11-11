import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import type { SortState } from '../hooks/useSort'

interface SortHeaderProps<K extends string> {
  label: string
  sortKey: K
  sort: SortState<K> | null // el orden actual de la tabla (useSort)
  onSort: (key: K) => void
  className?: string
}

// Encabezado de una columna que ordena la tabla al hacer clic.
export function SortHeader<K extends string>({ label, sortKey, sort, onSort, className }: SortHeaderProps<K>) {
  const direction = sort?.key === sortKey ? sort.direction : null
  const Icon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ArrowUpDown
  return (
    <th
      className={className}
      aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}
    >
      <button type="button" className="sort-button" onClick={() => onSort(sortKey)}>
        {label}
        <Icon size={14} aria-hidden="true" />
      </button>
    </th>
  )
}
