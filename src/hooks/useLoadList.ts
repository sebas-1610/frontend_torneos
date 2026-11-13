import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { useLoad } from './useLoad'

interface LoadedList<T> {
  items: T[]
  setItems: Dispatch<SetStateAction<T[]>>
  loading: boolean
  loadError: string | null
  reload: () => void // vuelve a pedir la lista sin mostrar "Cargando…" (después de un cambio)
  retry: () => void // vuelve a pedirla desde el estado de carga (botón "Reintentar")
}

// Lista vacía fija, para que `items` no cambie de identidad en cada render mientras carga.
const EMPTY: never[] = []

// Carga una lista del backend para las pantallas de tabla + detalle (Equipos, Jugadores...). Es useLoad
// con una lista vacía en lugar de null.
// fetcher debe ser una función fija (ej: findTeams), no una creada en cada render.
export function useLoadList<T>(fetcher: () => Promise<T[]>, enabled = true): LoadedList<T> {
  const { data, setData, loading, loadError, reload, retry } = useLoad(fetcher, enabled)

  const setItems = useCallback<Dispatch<SetStateAction<T[]>>>(
    (value) => setData((current) => (typeof value === 'function' ? value(current ?? EMPTY) : value)),
    [setData],
  )

  return { items: data ?? EMPTY, setItems, loading, loadError, reload, retry }
}
