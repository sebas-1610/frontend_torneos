import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react'
import { errorMessage } from '../../api/client'
import { confirmPayment, type TicketPurchase } from '../../api/tickets'
import type { ActionError } from '../../components/ActionAlert'
import { clearHashQuery, openEpaycoCheckout, refPaycoFromHash } from './epayco'
import { forgetCheckout, lastCheckout, rememberCheckout, type StoredCheckout } from './pendingCheckouts'
import { SimulatedCheckoutDialog } from './SimulatedCheckoutDialog'
import { simulatedReference } from './simulatedGateway'

interface PaymentListener {
  onResult: (purchase: TicketPurchase) => void // la pasarela respondió cómo quedó el pago
  onClosed: (stored: StoredCheckout) => void // cerró la ventana de pago sin terminar
  onError: (error: ActionError) => void
}

export interface TicketPayment {
  pay: (stored: StoredCheckout) => void // abre la ventana de pago de una compra pendiente
  confirm: (reference: string, gatewayReference?: string) => Promise<void> // consulta cómo quedó el pago
  busyReference: string | null // la compra que se está consultando
  opening: boolean // cargando la ventana de ePayco
  checkoutDialog: ReactNode // la pasarela de prueba, cuando es la que usa el backend
}

// El pago de una compra pendiente (HU-GE-04, criterio 18): abre la ventana de la pasarela que usa el
// backend (ePayco o la de prueba) y, al terminar, le pide al backend que confirme el pago con la
// referencia que dio la pasarela; el backend se lo pregunta a la pasarela, nunca le cree al navegador.
// También atiende el regreso desde ePayco con ?ref_payco=... en la URL. No sabe de listas ni de avisos:
// lo que pasó se lo cuenta a la pantalla (S de SOLID).
export function useTicketPayment(listener: PaymentListener): TicketPayment {
  const [busyReference, setBusyReference] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)
  const [simulated, setSimulated] = useState<StoredCheckout | null>(null)
  // Las compras cuyo pago ya se confirmó: al cerrar después la ventana de ePayco (que se queda mostrando
  // su comprobante), no se dice que se cerró sin pagar.
  const settledRef = useRef(new Set<string>())

  async function confirm(reference: string, gatewayReference?: string) {
    setBusyReference(reference)
    try {
      const purchase = await confirmPayment(reference, gatewayReference)
      if (purchase.status !== 'PENDIENTE') {
        forgetCheckout(reference)
        settledRef.current.add(reference)
      }
      listener.onResult(purchase)
    } catch (err) {
      listener.onError({ title: 'No se pudo consultar el pago', message: errorMessage(err) })
    } finally {
      setBusyReference(null)
    }
  }

  function pay(stored: StoredCheckout) {
    rememberCheckout(stored)
    if (stored.gateway !== 'ePayco') {
      setSimulated(stored)
      return
    }
    setOpening(true)
    openEpaycoCheckout(stored.checkout, {
      onPaid: (gatewayReference) => void confirm(stored.reference, gatewayReference),
      onClosed: (paid) => {
        if (!paid && !settledRef.current.has(stored.reference)) listener.onClosed(stored)
      },
      onError: (message) => listener.onError({ title: 'ePayco no pudo procesar el pago', message }),
    })
      .catch((err) => listener.onError({ title: 'No se pudo abrir el pago', message: errorMessage(err) }))
      .finally(() => setOpening(false))
  }

  // ePayco devuelve a "#mis-boletos?ref_payco=..." (solo cambia el hash: la página no se recarga). El
  // pago es de la última compra que abrió su ventana en este navegador.
  const handleReturn = useEffectEvent(() => {
    const gatewayReference = refPaycoFromHash()
    if (!gatewayReference) return
    clearHashQuery()
    const stored = lastCheckout()
    if (stored) {
      void confirm(stored.reference, gatewayReference)
    } else {
      listener.onError({
        title: 'No se pudo confirmar el pago',
        message:
          'ePayco devolvió un pago, pero este navegador no recuerda de qué compra es. Abre Boletos en el ' +
          'navegador donde hiciste la compra para confirmarlo.',
      })
    }
  })
  useEffect(() => {
    const onHashChange = () => handleReturn()
    onHashChange()
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const checkoutDialog = simulated && (
    <SimulatedCheckoutDialog
      stored={simulated}
      onChoose={(outcome) => {
        setSimulated(null)
        void confirm(simulated.reference, simulatedReference(simulated.reference, outcome))
      }}
      onClose={() => {
        setSimulated(null)
        listener.onClosed(simulated)
      }}
    />
  )

  return { pay, confirm, busyReference, opening, checkoutDialog }
}
