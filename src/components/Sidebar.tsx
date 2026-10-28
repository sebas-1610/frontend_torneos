import { ClipboardList, House, KeyRound, Shield, ShieldCheck, ShieldUser, Users, type LucideIcon } from 'lucide-react'
import { SportManagerLogo } from './BrandIcons'

interface NavItem {
  id: string
  label: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: House },
  { id: 'usuarios', label: 'Usuarios', icon: Users },
  { id: 'roles', label: 'Roles', icon: ShieldUser },
  { id: 'permisos', label: 'Permisos', icon: KeyRound },
  { id: 'seguridad', label: 'Seguridad', icon: Shield },
  { id: 'auditoria', label: 'Auditoría', icon: ClipboardList },
]

export function Sidebar({ activeId }: { activeId: string }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <SportManagerLogo />
        <div className="brand__text">
          <span className="brand__name">
            <span className="brand__sport">SPORT</span>MANAGER
          </span>
          <span className="brand__tagline">Plataforma administrativa</span>
        </div>
      </div>

      <nav className="nav" aria-label="Navegación principal">
        <ul>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className={`nav__item${id === activeId ? ' is-active' : ''}`}
                aria-current={id === activeId ? 'page' : undefined}
              >
                <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
                <span>{label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="session-card">
        <div>
          <p className="session-card__status">
            <span className="status-dot" aria-hidden="true" />
            Sesión activa
          </p>
          <p className="session-card__role">Administrador del sistema</p>
        </div>
        <ShieldCheck size={28} strokeWidth={1.75} className="session-card__icon" aria-hidden="true" />
      </div>
    </aside>
  )
}
