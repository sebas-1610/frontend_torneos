import type { Ticket, TicketPurchase, TicketStatus } from '../../api/tickets'
import { formatMoney } from '../../utils/money'
import { plural } from '../../utils/plural'
import { matchTitle } from '../matches/matchInfo'

// Textos, colores y cuentas de los boletos que comparten el detalle de un partido (lo del
// administrador) y "Boletos" (lo del aficionado), HU-GE-04.

// Cada estado con el color de su etiqueta (.tag).
export const TICKET_STATUSES: Record<TicketStatus, { label: string; tone: string }> = {
  PAGADO: { label: 'Pagado', tone: 'var(--tone-green)' },
  PENDIENTE: { label: 'Pendiente', tone: 'var(--tone-blue)' },
  RECHAZADO: { label: 'Rechazado', tone: 'var(--tone-red)' },
  ANULADO: { label: 'Anulado', tone: 'var(--muted)' },
}

// Minutos que un boleto pendiente aparta su cupo (PENDING_HOLD_MINUTES en el backend).
export const HOLD_MINUTES = 15

// Una compra: los boletos de una misma referencia (mismo partido, localidad, precio y estado).
export interface Purchase {
  reference: string
  status: TicketStatus
  tickets: Ticket[]
  first: Ticket // de él salen el partido, la localidad, el método de pago y las fechas
  total: number
}

// Agrupa los boletos por compra, conservando el orden en que llegan (los más recientes primero).
export function purchasesOf(tickets: Ticket[]): Purchase[] {
  const byReference = new Map<string, Ticket[]>()
  for (const ticket of tickets) {
    byReference.set(ticket.reference, [...(byReference.get(ticket.reference) ?? []), ticket])
  }
  return [...byReference.entries()].map(([reference, group]) => ({
    reference,
    status: group[0].status,
    tickets: [...group].sort((a, b) => a.id - b.id),
    first: group[0],
    total: group.reduce((sum, ticket) => sum + ticket.price, 0),
  }))
}

// Hasta qué hora aparta su cupo una compra pendiente: "15:42".
export function holdUntil(createdAt: string): string {
  const until = new Date(new Date(createdAt).getTime() + HOLD_MINUTES * 60_000)
  return until.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// Si ya pasaron los minutos de la reserva: el cupo volvió a la venta.
export function holdExpired(createdAt: string): boolean {
  return Date.now() > new Date(createdAt).getTime() + HOLD_MINUTES * 60_000
}

// Cómo se llama la pasarela para el aficionado.
export function gatewayLabel(gateway: string): string {
  return gateway === 'simulada' ? 'la pasarela de prueba' : gateway
}

// "3 boletos para Pumas vs Garzas"
export function purchaseTitle(purchase: Pick<TicketPurchase, 'quantity' | 'tickets'>): string {
  return `${plural(purchase.quantity, 'boleto', 'boletos')} para ${matchTitle(purchase.tickets[0].match)}`
}

// Lo que hoy importa de los boletos del aficionado.
// "Tienes 5 boletos pagados para 2 partidos. 1 compra espera el pago. Hay 3 partidos con venta de entradas."
export function ticketsSentence(purchases: Purchase[], onSale: number): string {
  const paid = purchases.filter((purchase) => purchase.status === 'PAGADO')
  const pending = purchases.filter((purchase) => purchase.status === 'PENDIENTE').length
  const tickets = paid.reduce((sum, purchase) => sum + purchase.tickets.length, 0)
  const matches = new Set(paid.map((purchase) => purchase.first.match.id)).size
  const sales =
    onSale === 0
      ? 'Hoy ningún partido vende entradas.'
      : `${onSale === 1 ? 'Hay 1 partido' : `Hay ${onSale} partidos`} con venta de entradas.`
  const mine =
    tickets === 0
      ? 'Todavía no tienes boletos pagados.'
      : `Tienes ${plural(tickets, 'boleto pagado', 'boletos pagados')} para ${plural(matches, 'partido', 'partidos')}.`
  const waiting = pending === 0 ? '' : ` ${pending === 1 ? '1 compra espera' : `${pending} compras esperan`} el pago.`
  return `${mine}${waiting} ${sales}`
}

// "3 × $ 30.000"
export function unitsText(quantity: number, price: number): string {
  return `${quantity} × ${formatMoney(price)}`
}
