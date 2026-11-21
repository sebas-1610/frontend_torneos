import { Pencil, Power, PowerOff, Trash2 } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { FanPaymentMethod } from '../../api/fanPaymentMethods'
import { RowAction } from '../../components/ListView'
import { fanMethodLabel, KINDS, methodDetail, methodNumber, methodTitle } from './paymentMethodInfo'

interface PaymentMethodCardProps {
  method: FanPaymentMethod
  index: number // para la entrada en cascada
  busy: boolean
  // Cada acción llega solo si la sesión puede hacerla.
  onEdit?: (method: FanPaymentMethod) => void
  onToggle?: (method: FanPaymentMethod) => void
  onDelete?: (method: FanPaymentMethod) => void
}

// Un método de pago como una tarjeta: el tipo con su icono, su nombre, lo que lo identifica sin datos
// completos ("•••• 4242" o el celular) y sus datos; abajo, Editar · Desactivar · Eliminar.
export function PaymentMethodCard({ method, index, busy, onEdit, onToggle, onDelete }: PaymentMethodCardProps) {
  const kind = KINDS[method.paymentMethod.kind]
  const Icon = kind.icon
  const name = fanMethodLabel(method)
  return (
    <li
      className={`pay-card${method.active ? '' : ' is-inactive'}`}
      style={{ '--i': index, '--kind': kind.tone } as CSSProperties}
    >
      <div className="pay-card__head">
        <span className="pay-card__kind">
          <Icon size={18} aria-hidden="true" />
          {method.paymentMethod.name}
        </span>
        {!method.active ? (
          <span className="pill pill--neutral">
            <span className="status-dot" aria-hidden="true" />
            Inactivo
          </span>
        ) : method.expired ? (
          <span className="pill pill--negative">
            <span className="status-dot" aria-hidden="true" />
            Vencida
          </span>
        ) : (
          <span className="pill pill--positive">
            <span className="status-dot" aria-hidden="true" />
            Activo
          </span>
        )}
      </div>
      <p className="pay-card__name">{methodTitle(method)}</p>
      <p className="pay-card__number num">{methodNumber(method)}</p>
      <p className="pay-card__detail">{methodDetail(method)}</p>
      {(onEdit || onToggle || onDelete) && (
        <div className="pay-card__foot row-actions">
          {onEdit && (
            <RowAction
              icon={Pencil}
              title={method.active ? 'Editar' : 'Actívalo para editarlo'}
              label={`Editar ${name}`}
              disabled={busy || !method.active}
              onClick={() => onEdit(method)}
            />
          )}
          {onToggle && (
            <RowAction
              icon={method.active ? PowerOff : Power}
              tone={method.active ? 'red' : 'green'}
              title={method.active ? 'Desactivar' : 'Activar'}
              label={`${method.active ? 'Desactivar' : 'Activar'} ${name}`}
              disabled={busy}
              onClick={() => onToggle(method)}
            />
          )}
          {onDelete && (
            <RowAction
              icon={Trash2}
              tone="red"
              title="Eliminar"
              label={`Eliminar ${name}`}
              disabled={busy}
              onClick={() => onDelete(method)}
            />
          )}
        </div>
      )}
    </li>
  )
}
