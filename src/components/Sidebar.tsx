import {
  KeyRound,
  Shield,
  ShieldCheck,
  ShieldUser,
  Shirt,
  Star,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import { ArcanosLogo, SoccerBallIcon } from './BrandIcons'

interface NavItem {
  id: string
  label: string
  icon: LucideIcon | typeof SoccerBallIcon // los mismos iconos que el recurso en la matriz de permisos
}

interface NavGroup {
  label: string
  items: NavItem[]
}

// Solo pantallas que ya existen: cuando otro microservicio traiga las suyas (torneos, reportes...),
// se agregan aquí y en PAGES de App.tsx. Perfil deportivo se suma a Gestión deportiva cuando tenga
// pantalla.
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Control de acceso',
    items: [
      { id: 'usuarios', label: 'Usuarios', icon: Users },
      { id: 'roles', label: 'Roles', icon: ShieldUser },
      { id: 'permisos', label: 'Permisos', icon: KeyRound },
    ],
  },
  {
    label: 'Gestión deportiva',
    items: [
      { id: 'deportes', label: 'Deportes', icon: SoccerBallIcon },
      { id: 'equipos', label: 'Equipos', icon: Shield },
      { id: 'jugadores', label: 'Jugadores', icon: Shirt },
      { id: 'habilidades', label: 'Habilidades', icon: Star },
    ],
  },
  { label: 'Mi cuenta', items: [{ id: 'perfil', label: 'Mi perfil', icon: UserRound }] },
]

interface SidebarProps {
  activeId: string | null // null mientras se sabe qué pantalla abrir
  // Solo en pantallas angostas: la barra lateral se abre como un panel sobre el contenido.
  open: boolean
  onClose: () => void
  // Qué pantallas puede abrir la sesión, según los permisos de sus roles (HU-SE-08).
  canOpen: (pageId: string) => boolean
  roles: string[] | null // null mientras llega /api/auth/me
}

export function Sidebar({ activeId, open, onClose, canOpen, roles }: SidebarProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Solo las opciones permitidas; un grupo sin opciones no se muestra.
  const groups = NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => canOpen(item.id)) })).filter(
    (group) => group.items.length > 0,
  )

  const roleLabel = roles === null ? 'Cargando…' : roles.length > 0 ? roles.join(' · ') : 'Sin roles asignados'

  return (
    <>
      <div className={`sidebar-backdrop${open ? ' is-open' : ''}`} aria-hidden="true" onClick={onClose} />
      <aside id="sidebar" className={`sidebar${open ? ' is-open' : ''}`} aria-label="Navegación principal">
        <div className="brand">
          <ArcanosLogo size={36} />
          <div className="brand__text">
            <span className="brand__name">Arcanos</span>
            <span className="brand__tagline">Plataforma administrativa</span>
          </div>
          <button ref={closeRef} type="button" className="sidebar__close" aria-label="Cerrar menú" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className="nav">
          {groups.map((group) => (
            <div key={group.label} className="nav__group">
              <p className="nav__label">{group.label}</p>
              <ul>
                {group.items.map(({ id, label, icon: Icon }) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className={`nav__item${id === activeId ? ' is-active' : ''}`}
                      aria-current={id === activeId ? 'page' : undefined}
                      onClick={onClose}
                    >
                      <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
                      <span>{label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Los roles reales de la sesión, no un texto fijo. */}
        <div className="session">
          <span className="status-dot" aria-hidden="true" />
          <div className="session__text">
            <p className="session__status">Sesión activa</p>
            <p className="session__role">{roleLabel}</p>
          </div>
          <ShieldCheck size={18} strokeWidth={1.6} className="session__icon" aria-hidden="true" />
        </div>
      </aside>
    </>
  )
}
