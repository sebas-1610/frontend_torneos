import type { TicketPurchase } from '../../api/tickets'
import { purchaseTitle } from './ticketInfo'

// La ventana de pago de cada compra pendiente, recordada en este navegador mientras dura la reserva
// (15 minutos): sirve para volver a abrirla ("Ir a pagar") y para saber de qué compra es el pago cuando
// ePayco devuelve al aficionado con ?ref_payco=... Es solo una ayuda: si el navegador no la guarda
// (ventana privada, otro equipo), la compra se consulta igual desde "Mis boletos".

const KEY = 'arcanos.pagos-pendientes'
const HOLD_MS = 15 * 60_000

export interface StoredCheckout {
  reference: string
  gateway: string
  checkout: { sessionId: string; test: boolean }
  total: number // para decirlo en la ventana de pago
  title: string // "3 boletos para Pumas vs Garzas"
  at: number // cuándo se abrió (ms)
}

function readAll(): StoredCheckout[] {
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(KEY) ?? '[]')
    const list = Array.isArray(parsed) ? (parsed as StoredCheckout[]) : []
    return list.filter((item) => Date.now() - item.at < HOLD_MS)
  } catch {
    return []
  }
}

function writeAll(list: StoredCheckout[]) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // Sin almacenamiento, "Ir a pagar" no aparece; lo demás funciona igual.
  }
}

// Lo que la ventana de pago necesita, si la compra quedó pendiente con una (null si no).
export function checkoutOf(purchase: TicketPurchase): StoredCheckout | null {
  const sessionId = purchase.checkout?.sessionId
  if (purchase.status !== 'PENDIENTE' || !sessionId) return null
  return {
    reference: purchase.reference,
    gateway: purchase.gateway,
    checkout: { sessionId, test: purchase.checkout?.test ?? true },
    total: purchase.total,
    title: purchaseTitle(purchase),
    at: Date.now(),
  }
}

export function rememberCheckout(stored: StoredCheckout) {
  writeAll([...readAll().filter((item) => item.reference !== stored.reference), stored])
}

export function storedCheckout(reference: string): StoredCheckout | null {
  return readAll().find((item) => item.reference === reference) ?? null
}

// La última que se abrió: de ella es el pago con que ePayco devuelve al aficionado.
export function lastCheckout(): StoredCheckout | null {
  return readAll().at(-1) ?? null
}

export function forgetCheckout(reference: string) {
  writeAll(readAll().filter((item) => item.reference !== reference))
}
