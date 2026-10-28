import { Bell, ChevronDown } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'

// El microservicio aún no expone autenticación: este usuario es fijo hasta que exista un endpoint de sesión.
const CURRENT_USER = {
  name: 'Carlos Admin',
  role: 'Administrador del sistema',
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export function TopBar({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="topbar">
      <div>
        <h1 className="topbar__title">{title}</h1>
        <p className="topbar__subtitle">{subtitle}</p>
      </div>

      <div className="topbar__actions">
        <ThemeToggle />
        <button type="button" className="icon-button" aria-label="Notificaciones">
          <Bell size={26} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <span className="topbar__divider" aria-hidden="true" />
        <button type="button" className="user-chip" aria-label={`Cuenta de ${CURRENT_USER.name}`}>
          <span className="avatar" aria-hidden="true">
            {initials(CURRENT_USER.name)}
            <span className="avatar__presence" />
          </span>
          <span className="user-chip__text">
            <span className="user-chip__name">{CURRENT_USER.name}</span>
            <span className="user-chip__role">{CURRENT_USER.role}</span>
          </span>
          <ChevronDown size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
