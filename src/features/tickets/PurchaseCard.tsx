import { Clock, CreditCard, MapPin, RefreshCw, Wallet } from 'lucide-react'
import type { CSSProperties } from 'react'
import { formatMoney } from '../../utils/money'
import { BetMatchLine } from '../bets/BetMatchLine'
import { paymentLabel } from '../payment-methods/paymentMethodInfo'
import { holdExpired, holdUntil, unitsText, type Purchase } from './ticketInfo'
import { TicketStatusTag } from './TicketStatusTag'

interface PurchaseCardProps {
  purchase: Purchase
  index: number // para la entrada en cascada
  busy: boolean // se está consultando su pago
  // Llegan solo si la sesión puede confirmar pagos y si aplican a esta compra pendiente.
  onPay?: () => void // volver a abrir su ventana de pago (la recuerda este navegador)
  onCheck?: () => void // preguntar cómo quedó el pago (ya hay una referencia de la pasarela)
}

// Una compra de "Mis boletos", como una entrada: el partido, dónde, cuánto y con qué se pagó, su estado
// y, tras la línea punteada, el código de cada boleto (lo que se muestra al entrar al escenario).
export function PurchaseCard({ purchase, index, busy, onPay, onCheck }: PurchaseCardProps) {
  const { first, status, tickets } = purchase
  const { match } = first
  const valid = status === 'PAGADO'
  const pending = status === 'PENDIENTE'

  return (
    <li className={`stub stub--${status.toLowerCase()}`} style={{ '--i': index } as CSSProperties}>
      <div className="stub__main">
        <div className="stub__top">
          <BetMatchLine match={match} />
          <TicketStatusTag status={status} />
        </div>
        <p className="stub__facts">
          <span className="stub__fact">
            <MapPin size={14} aria-hidden="true" />
            {match.venue ? `${match.venue.name} · ` : ''}
            <strong>{first.locality.name}</strong>
          </span>
          <span className="stub__fact num">
            <Wallet size={14} aria-hidden="true" />
            {unitsText(tickets.length, first.price)} =<strong className="stub__total">{formatMoney(purchase.total)}</strong>
          </span>
          <span className="stub__fact">
            <CreditCard size={14} aria-hidden="true" />
            {paymentLabel(first.paymentMethod)}
          </span>
        </p>

        {first.paymentDetail && !valid && (
          <p className={`stub__reason${status === 'RECHAZADO' ? ' is-negative' : ''}`}>{first.paymentDetail}</p>
        )}
        {status === 'ANULADO' && !first.paymentDetail && (
          <p className="stub__reason">El partido se canceló: los boletos se anularon y se devuelve lo pagado.</p>
        )}

        {pending && (
          <div className="stub__pending">
            <span className="stub__hold num">
              <Clock size={14} aria-hidden="true" />
              {first.gatewayReference
                ? 'La pasarela todavía no confirma el pago.'
                : holdExpired(first.createdAt)
                  ? `Sin pago · la reserva venció a las ${holdUntil(first.createdAt)} y el cupo volvió a la venta`
                  : `Esperando el pago · el cupo se libera a las ${holdUntil(first.createdAt)}`}
            </span>
            {onPay && (
              <button type="button" className="button button--primary stub__action" disabled={busy} onClick={onPay}>
                <Wallet size={16} aria-hidden="true" />
                Ir a pagar
              </button>
            )}
            {onCheck && (
              <button type="button" className="button button--outline stub__action" disabled={busy} onClick={onCheck}>
                <RefreshCw size={16} aria-hidden="true" />
                {busy ? 'Consultando…' : 'Consultar pago'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="stub__codes" aria-label={valid ? 'Códigos de los boletos' : 'Códigos (no sirven para entrar)'}>
        {tickets.map((ticket) => (
          <span key={ticket.id} className="stub__code">
            {ticket.code}
          </span>
        ))}
      </div>
    </li>
  )
}
