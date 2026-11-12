import { Eye, Pencil, Trash2 } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import './CardGrid.css'
import { RowAction } from './ListView'

interface EntityCardProps {
  index: number // posición en la cuadrícula, para la entrada en cascada
  layout: 'center' | 'start' // center: icono grande arriba (deportes); start: alineada a la izquierda (habilidades)
  visual: ReactNode // el icono de color del deporte o de la habilidad
  name: string
  meta?: ReactNode // línea corta bajo el nombre
  description?: ReactNode // hasta dos líneas
  figure: number // la cifra del pie (equipos, jugadores...)
  unit: string
  inactiveLabel: string | null // "Inactivo" / "Inactiva"; null si está activo
  selected: boolean
  busy: boolean
  canEdit: boolean
  canDelete: boolean
  onSelect: () => void // clic en la tarjeta
  onView: () => void // botón Ver: elige y, si el detalle está debajo, baja hasta él
  onEdit: () => void
  onDelete: () => void
}

// Tarjeta del catálogo de Deportes y Habilidades. Toda la tarjeta elige el elemento con el mouse; con
// el teclado se usa el botón Ver, por eso la tarjeta no es un botón (no puede tener botones adentro).
// Sus botones son los mismos de las filas de todas las tablas (RowAction, ListView.tsx).
export function EntityCard({
  index,
  layout,
  visual,
  name,
  meta,
  description,
  figure,
  unit,
  inactiveLabel,
  selected,
  busy,
  canEdit,
  canDelete,
  onSelect,
  onView,
  onEdit,
  onDelete,
}: EntityCardProps) {
  const classes = ['entity-card', `entity-card--${layout}`, selected && 'is-selected', inactiveLabel && 'is-inactive']
  return (
    <li className="card-grid__item" style={{ '--i': index } as CSSProperties}>
      <article
        className={classes.filter(Boolean).join(' ')}
        aria-label={name}
        aria-current={selected ? 'true' : undefined}
        onClick={onSelect}
      >
        {inactiveLabel && <span className="pill pill--neutral entity-card__status">{inactiveLabel}</span>}
        <span className="entity-card__visual">{visual}</span>
        <span className="entity-card__name">{name}</span>
        {meta && <span className="entity-card__meta">{meta}</span>}
        {description && <span className="entity-card__description">{description}</span>}

        <div className="entity-card__foot">
          <span className="entity-card__count">
            <span className="entity-card__figure num">{figure}</span> {unit}
          </span>
          <div className="row-actions">
            <RowAction icon={Eye} title="Ver detalle" label={`Ver ${name}`} onClick={onView} />
            {canEdit && (
              <RowAction icon={Pencil} title="Editar" label={`Editar ${name}`} disabled={busy} onClick={onEdit} />
            )}
            {canDelete && (
              <RowAction
                icon={Trash2}
                tone="red"
                title="Eliminar"
                label={`Eliminar ${name}`}
                disabled={busy}
                onClick={onDelete}
              />
            )}
          </div>
        </div>
      </article>
    </li>
  )
}
