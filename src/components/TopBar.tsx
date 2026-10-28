import { Bell, ChevronDown, ChevronRight, Menu } from 'lucide-react'
import { SportManagerLogo } from './BrandIcons'
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

interface TopBarProps {
  section: string
  page: string
  menuOpen: boolean
  onOpenMenu: () => void
}

export function TopBar({ section, page, menuOpen, onOpenMenu }: TopBarProps) {
  return (
    <header className="topbar">
      <button
        type="button"
        className="icon-button topbar__menu"
        aria-label="Abrir menú"
        aria-expanded={menuOpen}
        aria-controls="sidebar"
        onClick={onOpenMenu}
      >
        <Menu size={20} aria-hidden="true" />
      </button>
      <span className="topbar__mark" aria-hidden="true">
        <SportManagerLogo size={28} />
      </span>

      <nav className="breadcrumb" aria-label="Ubicación">
        <a href="#roles">{section}</a>
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page">{page}</span>
      </nav>

      <div className="topbar__actions">
        <ThemeToggle />
        <button type="button" className="icon-button" aria-label="Notificaciones">
          <Bell size={19} strokeWidth={1.6} aria-hidden="true" />
        </button>
        <div className="topbar__account">
          <button type="button" className="user-chip" aria-label={`Cuenta de ${CURRENT_USER.name}`}>
            <span className="avatar" aria-hidden="true">
              {initials(CURRENT_USER.name)}
              <span className="avatar__presence" />
            </span>
            <span className="user-chip__text">
              <span className="user-chip__name">{CURRENT_USER.name}</span>
              <span className="user-chip__role">{CURRENT_USER.role}</span>
            </span>
            <ChevronDown size={16} aria-hidden="true" className="user-chip__chevron" />
          </button>
        </div>
      </div>
    </header>
  )
}
