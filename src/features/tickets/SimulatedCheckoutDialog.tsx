import { CircleCheck, CircleX, Clock, FlaskConical, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { formatMoney } from '../../utils/money'
import type { StoredCheckout } from './pendingCheckouts'
import type { SimulatedOutcome } from './simulatedGateway'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'

interface SimulatedCheckoutDialogProps {
  stored: StoredCheckout
  onChoose: (outcome: SimulatedOutcome) => void
  onClose: () => void // cerró sin pagar
}

// La ventana de pago cuando el backend usa la pasarela de prueba (PAYMENTS_PROVIDER=simulada): hace
// las veces del checkout de ePayco, sin cobrar nada, para probar cada final del pago desde la interfaz.
export function SimulatedCheckoutDialog({ stored, onChoose, onClose }: SimulatedCheckoutDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const chosenRef = useRef(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  function choose(outcome: SimulatedOutcome) {
    chosenRef.current = true
    onChoose(outcome)
  }

  return (
    <dialog
      ref={dialogRef}
      className="form-dialog sim-checkout"
      aria-labelledby="sim-checkout-title"
      onClose={() => {
        if (!chosenRef.current) onClose()
      }}
    >
      <div className="form-dialog__form">
        <div className="form-dialog__head">
          <span className="panel-head__icon" aria-hidden="true">
            <FlaskConical size={16} />
          </span>
          <h2 id="sim-checkout-title" className="panel__title">
            Pasarela de prueba
          </h2>
          <button
            type="button"
            className="icon-button icon-button--small"
            aria-label="Cerrar sin pagar"
            onClick={() => dialogRef.current?.close()}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="sim-checkout__amount">
          <span className="sim-checkout__label">{stored.title}</span>
          <span className="sim-checkout__value num">{formatMoney(stored.total)}</span>
        </div>
        <p className="form-dialog__note">
          El sistema está en modo de prueba: aquí no se cobra nada. Elige cómo termina el pago para ver qué pasa en
          cada caso.
        </p>

        <div className="sim-checkout__choices">
          <button type="button" className="button button--primary" onClick={() => choose('APROBADO')}>
            <CircleCheck size={16} aria-hidden="true" />
            Aprobar pago
          </button>
          <button type="button" className="button button--outline" onClick={() => choose('PENDIENTE')}>
            <Clock size={16} aria-hidden="true" />
            Dejarlo pendiente
          </button>
          <button type="button" className="button button--outline row-actions__danger" onClick={() => choose('RECHAZADO')}>
            <CircleX size={16} aria-hidden="true" />
            Rechazar pago
          </button>
        </div>

        <div className="form-dialog__actions">
          <button type="button" className="button button--text" onClick={() => dialogRef.current?.close()}>
            Cerrar sin pagar
          </button>
        </div>
      </div>
    </dialog>
  )
}
