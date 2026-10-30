import { useEffect, useRef, useState } from 'react'
import { Bell, ChevronDown, ChevronRight, LogOut, Menu } from 'lucide-react'
import type { User } from '../api/auth'
import { AccountMenu } from './AccountMenu'
import { ArcanosLogo } from './BrandIcons'
import { ThemeToggle } from './ThemeToggle'

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
  user: User | null // null mientras llega la respuesta de /api/auth/me
  onUserChange: (user: User) => void
  onLogout: () => void
}

export function TopBar({ section, page, menuOpen, onOpenMenu, user, onUserChange, onLogout }: TopBarProps) {
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const name = user?.name ?? 'Mi cuenta'

  // Cierra el menú de la cuenta al hacer clic fuera o al presionar Escape.
  useEffect(() => {
    if (!accountOpen) return
    function handlePointer(event: PointerEvent) {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false)
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setAccountOpen(false)
    }
    document.addEventListener('pointerdown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [accountOpen])

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
        <ArcanosLogo size={28} />
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
        <div className="topbar__account" ref={accountRef}>
          <button
            type="button"
            className="user-chip"
            aria-label={`Cuenta de ${name}`}
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen((open) => !open)}
            disabled={!user}
          >
            <span className="avatar" aria-hidden="true">
              {initials(name)}
              <span className="avatar__presence" />
            </span>
            <span className="user-chip__text">
              <span className="user-chip__name">{name}</span>
              <span className="user-chip__role">{user?.email ?? 'Cargando…'}</span>
            </span>
            <ChevronDown size={16} aria-hidden="true" className="user-chip__chevron" />
          </button>
          {accountOpen && user && <AccountMenu user={user} onUserChange={onUserChange} />}
        </div>
        {/* Cerrar sesión (HU-SE-08): el backend invalida el token y volvemos al login. */}
        <button type="button" className="icon-button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={onLogout}>
          <LogOut size={19} strokeWidth={1.6} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
