import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { errorMessage } from '../api/client'

export interface Loaded<T> {
  data: T | null // null mientras carga o si falló
  setData: Dispatch<SetStateAction<T | null>>
  loading: boolean
  loadError: string | null
  reload: () => void // vuelve a pedir el dato sin mostrar "Cargando…" (después de un cambio)
  retry: () => void // vuelve a pedirlo desde el estado de carga (botón "Reintentar")
}

// Carga un dato del backend y lleva su estado: cargando, error y recarga. Solo hace eso: no sabe de
// dónde sale el dato (lo trae `fetcher`) ni cómo se muestra. Lo usan useLoadList y el perfil deportivo.
// fetcher debe ser una función fija (ej: findTeams, o una hecha con useCallback), no una creada en
// cada render.
export function useLoad<T>(fetcher: () => Promise<T>, enabled = true): Loaded<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let active = true
    fetcher()
      .then((value) => {
        if (!active) return
        setData(value)
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
    data,
    setData,
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
