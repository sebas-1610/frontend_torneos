import { MapPin, Minus, Plus, Tickets, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { errorMessage } from '../../api/client'
import type { FanPaymentMethod } from '../../api/fanPaymentMethods'
import { buyTickets, MAX_TICKETS_PER_PURCHASE, type TicketPurchase, type TicketSale } from '../../api/tickets'
import { formatMoney } from '../../utils/money'
import { plural } from '../../utils/plural'
import { BetMatchLine } from '../bets/BetMatchLine'
import { fanMethodLabel } from '../payment-methods/paymentMethodInfo'
import { HOLD_MINUTES, unitsText } from './ticketInfo'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'

interface BuyTicketsDialogProps {
  sale: TicketSale
  methods: FanPaymentMethod[] // los que sirven para pagar (activos y sin vencer)
  onClose: () => void
  onBought: (purchase: TicketPurchase) => void
}

// Comprar boletos para un partido (HU-GE-04): la localidad (con su precio y lo que queda), cuántos
// (hasta 10 y sin pasar lo disponible) y con cuál de sus métodos de pago. El total se ve antes de
// comprar. Si la pasarela necesita que pague allá, la pantalla abre su ventana al volver.
export function BuyTicketsDialog({ sale, methods, onClose, onBought }: BuyTicketsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { match, localities } = sale
  const [localityId, setLocalityId] = useState<number | null>(
    localities.find((locality) => locality.available > 0)?.id ?? null,
  )
  const [quantity, setQuantity] = useState(1)
  const [methodId, setMethodId] = useState<number | null>(methods[0]?.id ?? null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const locality = localities.find((item) => item.id === localityId) ?? null
  const max = locality ? Math.min(MAX_TICKETS_PER_PURCHASE, locality.available) : 0
  const count = Math.min(quantity, Math.max(max, 1))
  const canSubmit = locality !== null && max > 0 && methodId !== null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || locality === null || methodId === null) return
    setError(null)
    setSaving(true)
    try {
      onBought(
        await buyTickets({ matchId: match.id, localityId: locality.id, quantity: count, fanPaymentMethodId: methodId }),
      )
    } catch (err) {
      setError(errorMessage(err)) // ej: "En "Oriental" quedan 2 boletos…" o el pago rechazado
    } finally {
      setSaving(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="form-dialog form-dialog--wide" onClose={onClose} aria-labelledby="buy-form-title">
      <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
        <div className="form-dialog__head">
          <span className="panel-head__icon" aria-hidden="true">
            <Tickets size={16} />
          </span>
          <h2 id="buy-form-title" className="panel__title">
            Comprar boletos
          </h2>
          <button
            type="button"
            className="icon-button icon-button--small"
            aria-label="Cerrar"
            onClick={() => dialogRef.current?.close()}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="bet-form__match">
          <BetMatchLine match={match} />
          {match.venue && (
            <p className="buy-form__venue">
              <MapPin size={14} aria-hidden="true" />
              {match.venue.name} · {match.venue.city}
            </p>
          )}
        </div>

        <fieldset className="type-choice">
          <legend className="type-choice__legend">Localidad</legend>
          <div className="type-choice__options">
            {localities.map((item) => {
              const checked = item.id === localityId
              const soldOut = item.available === 0
              return (
                <label
                  key={item.id}
                  className={`type-choice__option buy-form__locality${checked ? ' is-checked' : ''}${soldOut ? ' is-disabled' : ''}`}
                  style={{ '--tag': 'var(--tone-blue)' } as CSSProperties}
                >
                  <input
                    type="radio"
                    name="buy-locality"
                    value={item.id}
                    checked={checked}
                    disabled={soldOut}
                    onChange={() => {
                      setLocalityId(item.id)
                      setQuantity((current) => Math.min(current, Math.min(MAX_TICKETS_PER_PURCHASE, item.available)))
                    }}
                  />
                  <span className="type-choice__text">
                    <span className="type-choice__label">{item.name}</span>
                    <span className="type-choice__description num">
                      {soldOut ? 'Agotada' : plural(item.available, 'disponible', 'disponibles')}
                    </span>
                  </span>
                  <span className="buy-form__price num">{formatMoney(item.price)}</span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="form-dialog__row">
          <div className="login__field">
            <span id="buy-quantity-label">Cantidad {max > 0 && `(máximo ${max})`}</span>
            <div className="stepper" role="group" aria-labelledby="buy-quantity-label">
              <button
                type="button"
                className="stepper__button"
                aria-label="Un boleto menos"
                disabled={count <= 1}
                onClick={() => setQuantity(count - 1)}
              >
                <Minus size={16} aria-hidden="true" />
              </button>
              <output className="stepper__value num" aria-live="polite">
                {count}
              </output>
              <button
                type="button"
                className="stepper__button"
                aria-label="Un boleto más"
                disabled={count >= max}
                onClick={() => setQuantity(count + 1)}
              >
                <Plus size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
          <label className="login__field">
            <span>Método de pago</span>
            <select value={methodId ?? ''} onChange={(e) => setMethodId(e.target.value === '' ? null : Number(e.target.value))}>
              <option value="" disabled>
                {methods.length === 0 ? 'No tienes métodos de pago que sirvan' : 'Elige uno de tus métodos de pago'}
              </option>
              {methods.map((method) => (
                <option key={method.id} value={method.id}>
                  {fanMethodLabel(method)} · {method.paymentMethod.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Lo que importa de la compra: cuánto va a pagar. */}
        <div className="bet-summary" aria-live="polite">
          <span className="bet-summary__label">Total a pagar</span>
          <span className="bet-summary__value num">{locality ? formatMoney(locality.price * count) : '—'}</span>
          <span className="bet-summary__detail num">
            {locality ? `${unitsText(count, locality.price)} · ${locality.name}` : 'Elige una localidad.'}
          </span>
        </div>
        <p className="form-dialog__note">
          Cada boleto tiene su código para entrar al escenario. Si el pago se hace en la pasarela, tus boletos quedan
          apartados {HOLD_MINUTES} minutos mientras pagas.
        </p>

        {error && (
          <p className="login__error" role="alert">
            {error}
          </p>
        )}

        <div className="form-dialog__actions">
          <button type="button" className="button button--outline" onClick={() => dialogRef.current?.close()}>
            Cancelar
          </button>
          <button type="submit" className="button button--primary" disabled={saving || !canSubmit}>
            {saving ? 'Comprando…' : count > 1 ? `Comprar ${count} boletos` : 'Comprar boleto'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
