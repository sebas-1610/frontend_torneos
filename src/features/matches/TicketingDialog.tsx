import { Ticket as TicketIcon, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '../../api/client'
import type { Match } from '../../api/matches'
import {
  configureMatchTicketing,
  MAX_TICKET_PRICE,
  MIN_TICKET_PRICE,
  type MatchTicketing,
  type TicketingLocality,
} from '../../api/tickets'
import { formatMoney } from '../../utils/money'
import { plural } from '../../utils/plural'
import { venueName } from '../venues/venueInfo'
import { matchTitle } from './matchInfo'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'

interface TicketingDialogProps {
  match: Match // programado y con escenario
  ticketing: MatchTicketing
  onClose: () => void
  onSaved: (ticketing: MatchTicketing) => void
}

// Lo que se escribe en cada localidad: si se vende y a qué precio (solo los dígitos).
interface Row {
  selling: boolean
  price: string
}

// "30.000" o "30000" → 30000; null si no es un precio válido (entero entre 1.000 y 2.000.000, la regla
// de MatchTicketingDto).
function parsePrice(digits: string): number | null {
  if (!/^\d{4,7}$/.test(digits)) return null
  const value = Number(digits)
  return value >= MIN_TICKET_PRICE && value <= MAX_TICKET_PRICE ? value : null
}

// Los dígitos con sus puntos de miles mientras se escriben: "30000" → "30.000".
function grouped(digits: string): string {
  return digits === '' ? '' : Number(digits).toLocaleString('es-CO')
}

// Configurar la venta de entradas de un partido (HU-GE-04, lo del administrador): qué localidades de su
// escenario se venden y a qué precio, y si la venta está abierta. Una localidad con boletos vendidos no
// se quita; su precio sí cambia (los boletos ya vendidos conservan el suyo).
export function TicketingDialog({ match, ticketing, onClose, onSaved }: TicketingDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  // Las activas y las que ya tienen precio, aunque se hayan desactivado (para poder quitarlas).
  const localities = ticketing.localities.filter((locality) => locality.active || locality.price !== null)
  const [rows, setRows] = useState<Record<number, Row>>(() =>
    Object.fromEntries(
      localities.map((locality) => [
        locality.id,
        { selling: locality.price !== null, price: locality.price === null ? '' : String(locality.price) },
      ]),
    ),
  )
  // Sin precios todavía, la venta empieza abierta: es para lo que se configura.
  const [open, setOpen] = useState(ticketing.open || localities.every((locality) => locality.price === null))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const chosen = localities.filter((locality) => rows[locality.id]?.selling)
  const invalid = chosen.some((locality) => parsePrice(rows[locality.id].price) === null)
  const needsOne = open && chosen.length === 0
  const canSubmit = !invalid && !needsOne

  function change(locality: TicketingLocality, next: Partial<Row>) {
    setRows((current) => ({ ...current, [locality.id]: { ...current[locality.id], ...next } }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return
    setError(null)
    setSaving(true)
    try {
      const prices = chosen.map((locality) => ({
        localityId: locality.id,
        price: parsePrice(rows[locality.id].price) as number,
      }))
      onSaved(await configureMatchTicketing(match.id, { open, prices }))
    } catch (err) {
      setError(errorMessage(err)) // ej: una localidad desactivada o con boletos que se quiso quitar
    } finally {
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="form-dialog form-dialog--wide"
      onClose={onClose}
      aria-labelledby="ticketing-form-title"
    >
      <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
        <div className="form-dialog__head">
          <span className="panel-head__icon" aria-hidden="true">
            <TicketIcon size={16} />
          </span>
          <h2 id="ticketing-form-title" className="panel__title">
            Venta de {matchTitle(match)}
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

        <p className="form-dialog__note">
          Localidades de {match.venue ? venueName(match.venue) : 'su escenario'}: marca las que se venden y fija su
          precio por boleto.
        </p>

        {localities.length === 0 ? (
          <p className="field-hint">
            El escenario no tiene localidades activas: agrégalas en Escenarios para vender entradas.
          </p>
        ) : (
          <ul className="price-list" aria-label="Precio de cada localidad">
            {localities.map((locality) => {
              const row = rows[locality.id]
              const locked = locality.sold > 0 // con boletos vendidos no se quita de la venta
              const wrong = row.selling && row.price !== '' && parsePrice(row.price) === null
              return (
                <li key={locality.id} className={`price-row${row.selling ? '' : ' is-off'}`}>
                  <label className="price-row__pick">
                    <input
                      type="checkbox"
                      checked={row.selling}
                      disabled={locked || (!locality.active && !row.selling)}
                      onChange={(e) => change(locality, { selling: e.target.checked })}
                    />
                    <span className="price-row__text">
                      <span className="price-row__name">{locality.name}</span>
                      <span className="price-row__detail num">
                        {locality.capacity.toLocaleString('es-CO')} puestos
                        {locality.sold > 0 && ` · ${plural(locality.sold, 'vendido', 'vendidos')}: no se quita`}
                        {!locality.active && ' · desactivada'}
                      </span>
                    </span>
                  </label>
                  <label className={`price-row__price${wrong ? ' is-wrong' : ''}`}>
                    <span className="sr-only">Precio en {locality.name}</span>
                    <span className="price-row__currency" aria-hidden="true">
                      $
                    </span>
                    <input
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="30.000"
                      disabled={!row.selling}
                      aria-invalid={wrong || undefined}
                      value={grouped(row.price)}
                      onChange={(e) => change(locality, { price: e.target.value.replace(/\D/g, '').slice(0, 7) })}
                    />
                  </label>
                </li>
              )
            })}
          </ul>
        )}
        {invalid ? (
          <p className="field-hint">
            Cada precio debe ser un valor entero entre {formatMoney(MIN_TICKET_PRICE)} y {formatMoney(MAX_TICKET_PRICE)}.
          </p>
        ) : needsOne ? (
          <p className="field-hint">Para abrir la venta marca al menos una localidad con su precio.</p>
        ) : (
          <p className="form-dialog__note">Los boletos ya vendidos conservan el precio con el que se compraron.</p>
        )}

        <label className="check-row">
          <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} />
          <span>
            <span className="check-row__label">Venta abierta</span>
            <span className="check-row__hint">
              Los aficionados pueden comprar hasta la hora del partido, cuando se cierra sola. Si la cierras, los
              boletos vendidos siguen igual.
            </span>
          </span>
        </label>

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
            {saving ? 'Guardando…' : 'Guardar venta'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
