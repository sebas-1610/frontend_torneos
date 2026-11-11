import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { errorMessage } from '../api/client'

interface LoadedList<T> {
  items: T[]
  setItems: Dispatch<SetStateAction<T[]>>
  loading: boolean
  loadError: string | null
  reload: () => void // vuelve a pedir la lista sin mostrar "Cargando…" (después de un cambio)
  retry: () => void // vuelve a pedirla desde el estado de carga (botón "Reintentar")
}

// Carga una lista del backend para las pantallas de tabla + detalle (Equipos, Jugadores).
// fetcher debe ser una función fija (ej: findTeams), no una creada en cada render.
export function useLoadList<T>(fetcher: () => Promise<T[]>, enabled = true): LoadedList<T> {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(enabled)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let active = true
    fetcher()
      .then((list) => {
        if (!active) return
        setItems(list)
        setLoadError(null)
      })
      .catch((err) => {
        if (active) setLoadError(errorMessage(err)) // ej: 503 si ms_torneos_security no responde
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [fetcher, enabled, reloadKey])

  return {
    items,
    setItems,
    loading,
    loadError,
    reload: () => setReloadKey((key) => key + 1),
    retry: () => {
      setLoading(true)
      setLoadError(null)
      setReloadKey((key) => key + 1)
    },
  }
}
