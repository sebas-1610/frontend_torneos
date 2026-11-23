import { useCallback, useEffect, useState } from 'react'
import { errorMessage } from '../../api/client'
import { findTrackingHistory, HISTORY_PAGE, type PositionRecord } from '../../api/tracking'
import { buildFrames, frameDelay, type ReplayFrame, type ReplaySpeed } from './replay'

export interface TrackingReplay {
  loading: boolean
  loaded: number // posiciones descargadas hasta ahora (para "Cargando… 2.000")
  error: string | null
  retry: () => void
  frames: ReplayFrame[]
  index: number // el cuadro que se ve
  playing: boolean
  speed: ReplaySpeed
  play: () => void
  pause: () => void
  seek: (index: number) => void
  setSpeed: (speed: ReplaySpeed) => void
}

// El recorrido de un partido (HU-GC-09): descarga todo el historial (página por página) al montarse y lo
// reproduce cuadro a cuadro. Solo lleva el estado; la pantalla decide cómo se ve.
export function useTrackingReplay(matchId: number): TrackingReplay {
  const [loaded, setLoaded] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [frames, setFrames] = useState<ReplayFrame[]>([])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<ReplaySpeed>(1)

  // Descarga: página tras página hasta que una llegue incompleta.
  useEffect(() => {
    let active = true
    async function load() {
      const all: PositionRecord[] = []
      let afterId: number | null = null
      for (;;) {
        const page = await findTrackingHistory(matchId, afterId)
        if (!active) return
        all.push(...page)
        setLoaded(all.length)
        if (page.length < HISTORY_PAGE) break
        afterId = page[page.length - 1].id
      }
      const built = buildFrames(all)
      setFrames(built)
      setIndex(0)
      setPlaying(built.length > 1) // arranca solo
    }
    load()
      .catch((err) => {
        if (active) setError(errorMessage(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [matchId, attempt])

  // Reproducción: pasa al siguiente cuadro después de lo que tardó en el partido (según la velocidad).
  useEffect(() => {
    if (!playing || index >= frames.length - 1) return
    const timer = window.setTimeout(() => {
      setIndex(index + 1)
      if (index + 1 >= frames.length - 1) setPlaying(false) // llegó al final: queda en pausa
    }, frameDelay(frames, index, speed))
    return () => window.clearTimeout(timer)
  }, [playing, index, frames, speed])

  const play = useCallback(() => {
    // Desde el final, vuelve a empezar.
    setIndex((current) => (current >= frames.length - 1 ? 0 : current))
    setPlaying(true)
  }, [frames.length])

  return {
    loading,
    loaded,
    error,
    retry: () => {
      setError(null)
      setLoading(true)
      setLoaded(0)
      setAttempt((n) => n + 1)
    },
    frames,
    index,
    playing,
    speed,
    play,
    pause: () => setPlaying(false),
    seek: (target) => setIndex(Math.min(Math.max(0, target), Math.max(0, frames.length - 1))),
    setSpeed,
  }
}
