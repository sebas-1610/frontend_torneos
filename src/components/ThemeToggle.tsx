import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../theme/useTheme'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Modo oscuro"
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`theme-toggle${isDark ? ' is-dark' : ''}`}
      onClick={(event) => toggle(event.currentTarget)}
    >
      <Sun size={15} strokeWidth={2} aria-hidden="true" className="theme-toggle__mark theme-toggle__mark--sun" />
      <Moon size={15} strokeWidth={2} aria-hidden="true" className="theme-toggle__mark theme-toggle__mark--moon" />
      <span className="theme-toggle__thumb" aria-hidden="true">
        <Sun size={16} strokeWidth={2.4} className="theme-toggle__icon theme-toggle__icon--sun" />
        <Moon size={16} strokeWidth={2.4} className="theme-toggle__icon theme-toggle__icon--moon" />
      </span>
    </button>
  )
}
