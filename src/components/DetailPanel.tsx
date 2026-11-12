import { Pencil, Power, PowerOff, Trash2 } from 'lucide-react'
import type { CSSProperties, ReactNode, Ref } from 'react'
import { ActionAlert, type ActionError } from './ActionAlert'
import { AnimatedNumber } from './AnimatedNumber'
import { PanelHead, type IconType } from './PageHeading'
import './DetailPanel.css'
import './Vivid.css'

/*
 * Piezas del panel de detalle de Gestión deportiva (Deportes, Equipos, Jugadores, Habilidades): todas
 * las pantallas arman su detalle con estas, para que se vean igual.
 *
 *   <DetailPanel label="Detalle del equipo" icon={Info} ...>
 *     <DetailMain>      lo que identifica al elegido: <DetailHero> y <StatTiles>
 *     <DetailSide>      lo demás: <DetailSection> (descripción, listas) o una lista de datos
 *     <DetailActions>   Editar · Desactivar / Activar · Eliminar
 *   </DetailPanel>
 *
 * Con el detalle al lado de la lista se ve todo en una columna; debajo de la lista, DetailMain y
 * DetailSide quedan lado a lado (Vivid.css).
 */

interface DetailPanelProps {
  ref?: Ref<HTMLElement>
  label: string // "Detalle del equipo": título del panel
  icon: IconType
  titleId?: string // id del nombre del elegido (el h3 de DetailHero)
  emptyMessage: string | null // si no hay elegido, la frase que se muestra en su lugar
  error?: ActionError | null // la última acción rechazada por el backend
  onDismissError?: () => void
  children?: ReactNode
}

export function DetailPanel({
  ref,
  label,
  icon,
  titleId,
  emptyMessage,
  error,
  onDismissError,
  children,
}: DetailPanelProps) {
  return (
    <aside ref={ref} className="rail rail--detail rail--single" aria-label={label}>
      <section className="panel" aria-labelledby={emptyMessage === null ? titleId : undefined}>
        <PanelHead icon={icon} title={label} />
        {emptyMessage !== null ? (
          <p className="empty-state">{emptyMessage}</p>
        ) : (
          <>
            {error && <ActionAlert error={error} onDismiss={onDismissError ?? (() => {})} />}
            <div className="detail-cols">{children}</div>
          </>
        )}
      </section>
    </aside>
  )
}

export function DetailMain({ children }: { children: ReactNode }) {
  return <div className="detail-cols__main">{children}</div>
}

export function DetailSide({ children }: { children: ReactNode }) {
  return <div className="detail-cols__side">{children}</div>
}

interface DetailHeroProps {
  glow: string // color del foco de luz: el tono del equipo, de la categoría... (cualquier color CSS)
  visual: ReactNode // insignia, foto o icono grande
  children: ReactNode // nombre (h3.hero__name) y lo que va debajo
}

// El elegido bajo un foco de luz de su color.
export function DetailHero({ glow, visual, children }: DetailHeroProps) {
  return (
    <div className="hero" style={{ '--glow': glow } as CSSProperties}>
      {visual}
      <div className="hero__text">{children}</div>
    </div>
  )
}

export function StatTiles({ children }: { children: ReactNode }) {
  return <div className="stat-tiles">{children}</div>
}

interface StatTileProps {
  icon: IconType
  tone: string // variable de color: "--tone-blue"
  value: number
  label: string
}

// Una cifra del elegido: icono en un cuadro de color, número y rótulo.
export function StatTile({ icon: Icon, tone, value, label }: StatTileProps) {
  return (
    <p className="stat-tile" style={{ '--tile': `var(${tone})` } as CSSProperties}>
      <span className="stat-tile__icon" aria-hidden="true">
        <Icon size={20} />
      </span>
      <AnimatedNumber value={value} className="stat-tile__value" />
      <span className="stat-tile__label">{label}</span>
    </p>
  )
}

interface DetailSectionProps {
  title: string
  action?: ReactNode // botón o enlace al final del título (ej: "Agregar")
  children: ReactNode
}

// Sección del detalle: título, una línea y, si aplica, su acción.
export function DetailSection({ title, action, children }: DetailSectionProps) {
  return (
    <div className="detail-section">
      <div className="detail-section__head">
        <h3 className="detail-section__title">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

interface DetailActionsProps {
  noun: string // "equipo": para el botón "Eliminar equipo"
  active: boolean
  busy: boolean
  canUpdate: boolean
  canDelete: boolean
  onEdit: () => void
  onToggleActive: () => void
  onDelete: () => void
  disableIcon?: IconType
  enableIcon?: IconType
}

// Acciones del detalle: Editar (azul) y Desactivar (rojo) o Activar (verde); aparte, Eliminar.
export function DetailActions({
  noun,
  active,
  busy,
  canUpdate,
  canDelete,
  onEdit,
  onToggleActive,
  onDelete,
  disableIcon: DisableIcon = PowerOff,
  enableIcon: EnableIcon = Power,
}: DetailActionsProps) {
  if (!canUpdate && !canDelete) return null
  return (
    <div className="detail-cols__actions">
      {canUpdate && (
        <div className="detail__actions">
          <button type="button" className="button button--tint button--tint-blue" disabled={busy} onClick={onEdit}>
            <Pencil size={16} aria-hidden="true" />
            Editar
          </button>
          <button
            type="button"
            className={`button button--tint ${active ? 'button--tint-red' : 'button--tint-green'}`}
            disabled={busy}
            onClick={onToggleActive}
          >
            {active ? <DisableIcon size={16} /> : <EnableIcon size={16} />}
            {active ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      )}
      {/* Lo que borra va aparte, lejos de Editar. */}
      {canDelete && (
        <div className="detail__danger">
          <button type="button" className="button button--text row-actions__danger" disabled={busy} onClick={onDelete}>
            <Trash2 size={16} aria-hidden="true" />
            Eliminar {noun}
          </button>
        </div>
      )}
    </div>
  )
}
