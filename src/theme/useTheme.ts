import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

export type Theme = 'light' | 'dark'

// La misma clave la lee el script de index.html para aplicar el tema antes del primer render.
const STORAGE_KEY = 'sportmanager-theme'
const LIGHT_QUERY = '(prefers-color-scheme: light)'

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function systemTheme(): Theme {
  return window.matchMedia(LIGHT_QUERY).matches ? 'light' : 'dark'
}

function currentTheme(): Theme {
  const applied = document.documentElement.dataset.theme
  return applied === 'light' || applied === 'dark' ? applied : (storedTheme() ?? systemTheme())
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  function apply(next: Theme) {
    document.documentElement.dataset.theme = next
    setTheme(next)
  }

  // Mientras la persona no elija un tema, la app sigue al sistema.
  useEffect(() => {
    const query = window.matchMedia(LIGHT_QUERY)
    const handleChange = () => {
      if (storedTheme() === null) apply(systemTheme())
    }
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  // origin: el elemento desde el que se expande el nuevo tema en un círculo.
  function toggle(origin?: HTMLElement) {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Sin almacenamiento el cambio vale solo para esta visita.
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!origin || reduceMotion || typeof document.startViewTransition !== 'function') {
      apply(next)
      return
    }

    const rect = origin.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
    const root = document.documentElement
    root.style.setProperty('--reveal-x', `${x}px`)
    root.style.setProperty('--reveal-y', `${y}px`)
    root.style.setProperty('--reveal-r', `${radius}px`)

    document.startViewTransition(() => flushSync(() => apply(next)))
  }

  return { theme, toggle }
}
