import { ClipboardList, House, KeyRound, Shield, ShieldCheck, ShieldUser, Users, X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { ArcanosLogo } from './BrandIcons'

interface NavItem {
  id: string
  label: string
  icon: LucideIcon
}

interface NavGroup {
  label: string | null
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  { label: null, items: [{ id: 'dashboard', label: 'Dashboard', icon: House }] },
  {
    label: 'Control de acceso',
    items: [
      { id: 'usuarios', label: 'Usuarios', icon: Users },
      { id: 'roles', label: 'Roles', icon: ShieldUser },
      { id: 'permisos', label: 'Permisos', icon: KeyRound },
      { id: 'seguridad', label: 'Seguridad', icon: Shield },
      { id: 'auditoria', label: 'Auditoría', icon: ClipboardList },
    ],
  },
]

interface SidebarProps {
  activeId: string
  // Solo en pantallas angostas: la barra lateral se abre como un panel sobre el contenido.
  open: boolean
  onClose: () => void
}

export function Sidebar({ activeId, open, onClose }: SidebarProps) {
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
          {NAV_GROUPS.map((group) => (
            <div key={group.label ?? 'inicio'} className="nav__group">
              {group.label && <p className="nav__label">{group.label}</p>}
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

        <div className="session">
          <span className="status-dot" aria-hidden="true" />
          <div className="session__text">
            <p className="session__status">Sesión activa</p>
            <p className="session__role">Administrador del sistema</p>
          </div>
          <ShieldCheck size={18} strokeWidth={1.6} className="session__icon" aria-hidden="true" />
        </div>
      </aside>
    </>
  )
}
