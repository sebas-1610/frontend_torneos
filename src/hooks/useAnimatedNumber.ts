import { useEffect, useRef, useState } from 'react'

// Hace "rodar" una cifra hasta su nuevo valor, como un marcador. Con movimiento reducido salta directo.
export function useAnimatedNumber(value: number, duration = 450): number {
  const [display, setDisplay] = useState(value)
  const current = useRef(value)

  useEffect(() => {
    const from = current.current
    if (from === value) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const total = reduceMotion ? 0 : duration
    const start = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const progress = total === 0 ? 1 : Math.min(1, (now - start) / total)
      const eased = 1 - (1 - progress) ** 3
      const next = Math.round(from + (value - from) * eased)
      current.current = next
      setDisplay(next)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return display
}
