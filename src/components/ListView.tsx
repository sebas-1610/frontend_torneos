import { CircleAlert, List, Search, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { plural } from '../utils/plural'
import { ActionAlert, type ActionError } from './ActionAlert'
import { PanelHead, type IconType } from './PageHeading'
import './ListPage.css'
import './DetailPanel.css'
import './Vivid.css'

/*
 * Piezas de todas las pantallas de lista (Usuarios, Roles, Permisos, Deportes, Equipos, Jugadores,
 * Habilidades). Van dentro de una página con la clase page--vivid, debajo de PageHeading:
 *   <ListToolbar>  búsqueda, filtros y la acción principal a la derecha;
 *   <ListPanel>    el panel con su título, la cantidad y los estados cargando / error / vacío;
 *   <RowActions>   la celda de botones de una fila, con un <RowAction> de color por acción.
 */

interface ListToolbarProps {
  query: string
  onQueryChange: (value: string) => void
  placeholder: string // ej: "Buscar por nombre o correo"
  children?: ReactNode // los filtros (select)
  actions?: ReactNode // a la derecha: la acción principal (ToolbarButton) y, si hay, otras
}

// Barra de búsqueda y filtros. El backend no filtra: cada pantalla aplica la búsqueda sobre su lista.
export function ListToolbar({ query, onQueryChange, placeholder, children, actions }: ListToolbarProps) {
  return (
    <div className="panel toolbar">
      <label className="list-search">
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          placeholder={placeholder}
          aria-label={placeholder}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </label>
      {children}
      {actions && <div className="toolbar__actions">{actions}</div>}
    </div>
  )
}

interface ToolbarButtonProps {
  icon: LucideIcon
  label: string
  onClick?: () => void
  href?: string // si lleva a otra pantalla (ej: "Asignar permisos")
  primary?: boolean // la acción principal va en dorado; las demás, con borde
}

export function ToolbarButton({ icon: Icon, label, onClick, href, primary = false }: ToolbarButtonProps) {
  const className = `button ${primary ? 'button--primary' : 'button--outline'}`
  const content = (
    <>
      <Icon size={18} aria-hidden="true" />
      {label}
    </>
  )
  return href ? (
    <a className={className} href={href}>
      {content}
    </a>
  ) : (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  )
}

interface ListPanelProps {
  title: string // ej: "Lista de usuarios"
  titleId: string
  icon?: IconType
  noun: [one: string, many: string] // ej: ['usuario', 'usuarios'], para "5 usuarios" y el pie
  total: number // cuántos hay en total
  shown?: number // cuántos se ven con los filtros; si se pasa, sale el pie "Mostrando 3 de 5 usuarios"
  loading: boolean
  loadError: string | null // la lista no se pudo cargar
  onRetry: () => void
  emptyMessage: string | null // qué decir si no hay nada que mostrar; null si hay elementos
  error?: ActionError | null // una acción rechazada, en las pantallas sin panel de detalle
  onDismissError?: () => void
  children: ReactNode // la tabla o las tarjetas
}

// El panel de la lista con sus estados: cargando, no se pudo cargar (con "Reintentar"), vacío y con datos.
export function ListPanel({
  title,
  titleId,
  icon = List,
  noun,
  total,
  shown,
  loading,
  loadError,
  onRetry,
  emptyMessage,
  error,
  onDismissError,
  children,
}: ListPanelProps) {
  const [one, many] = noun
  return (
    <section className="panel" aria-labelledby={titleId} aria-busy={loading}>
      <PanelHead
        icon={icon}
        title={title}
        titleId={titleId}
        count={loading || loadError ? null : plural(total, one, many)}
      />

      {error && onDismissError && <ActionAlert error={error} onDismiss={onDismissError} />}

      {loadError ? (
        <div className="inline-error" role="alert">
          <CircleAlert size={16} aria-hidden="true" />
          <span>{loadError}</span>
          <button type="button" className="text-action" onClick={onRetry}>
            Reintentar
          </button>
        </div>
      ) : loading ? (
        <p className="empty-state">Cargando {many}…</p>
      ) : emptyMessage ? (
        <p className="empty-state">{emptyMessage}</p>
      ) : (
        <>
          {children}
          {shown !== undefined && (
            <p className="list-foot">
              Mostrando {shown} de {plural(total, one, many)}
            </p>
          )}
        </>
      )}
    </section>
  )
}

// Celda de los botones de una fila. Si la fila se elige con un clic, los botones no la eligen por su
// cuenta: cada uno hace lo suyo.
export function RowActions({ children }: { children: ReactNode }) {
  return (
    <td onClick={(e) => e.stopPropagation()}>
      <div className="row-actions">{children}</div>
    </td>
  )
}

export type RowActionTone = 'blue' | 'red' | 'green'

interface RowActionProps {
  icon: LucideIcon
  title: string // lo que dice al pasar el mouse (ej: "Editar")
  label: string // lo que lee el lector de pantalla (ej: "Editar a Ana Pérez")
  tone?: RowActionTone // azul: ver, editar, abrir; rojo: eliminar o desactivar; verde: activar
  disabled?: boolean
  onClick?: () => void
  href?: string // si abre otra pantalla (ej: la matriz de permisos del rol)
}

// Botón de fila: un cuadro de color con su icono.
export function RowAction({ icon: Icon, title, label, tone = 'blue', disabled, onClick, href }: RowActionProps) {
  const className = `act act--${tone}`
  const icon = <Icon size={16} aria-hidden="true" />
  return href ? (
    <a className={className} href={href} title={title} aria-label={label}>
      {icon}
    </a>
  ) : (
    <button type="button" className={className} title={title} aria-label={label} disabled={disabled} onClick={onClick}>
      {icon}
    </button>
  )
}

interface StatusPillProps {
  active: boolean
  activeLabel?: string
  inactiveLabel?: string // ej: "Inactiva" para una habilidad
}

// Estado del elemento en una fila: Activo (verde) o Inactivo.
export function StatusPill({ active, activeLabel = 'Activo', inactiveLabel = 'Inactivo' }: StatusPillProps) {
  return (
    <span className={`pill ${active ? 'pill--positive' : 'pill--neutral'}`}>
      <span className="status-dot" aria-hidden="true" />
      {active ? activeLabel : inactiveLabel}
    </span>
  )
}
