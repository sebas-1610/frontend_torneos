import { request } from './client'
import type { Match, MatchStatus } from './matches'
import type { TeamSummary } from './teams'
import type { TournamentSummary } from './tournaments'
import type { VenueLocation } from './venues'

// Rutas de la venta de entradas (ms_torneos_deportiva, HU-GE-04): /matches/{id}/ticketing (lo que
// configura el administrador), /ticketing/matches (lo que se vende hoy) y /tickets (los boletos). El
// aficionado sale del token: cada uno ve y compra solo los suyos.

// PENDIENTE: el pago no ha llegado (aparta su cupo 15 minutos). Los demás son finales.
export type TicketStatus = 'PENDIENTE' | 'PAGADO' | 'RECHAZADO' | 'ANULADO'

// Los mismos límites que valida el backend (ticket-rules.ts).
export const MIN_TICKET_PRICE = 1000
export const MAX_TICKET_PRICE = 2_000_000
export const MAX_TICKETS_PER_PURCHASE = 10

// Una localidad del escenario en la venta de un partido.
export interface TicketingLocality {
  id: number
  name: string
  capacity: number
  active: boolean
  price: number | null // null: no se vende en este partido
  sold: number // pagados y pendientes que apartan cupo
  available: number
}

// La venta de entradas de un partido.
export interface MatchTicketing {
  matchId: number
  open: boolean // lo que fijó el administrador
  onSale: boolean // si hoy se puede comprar: abierta, partido programado y sin haber llegado su hora
  venue: VenueLocation | null
  localities: TicketingLocality[] // todas las del escenario, por nombre
}

// Reemplaza los precios: una localidad que no esté en la lista deja de venderse.
export interface TicketingInput {
  open: boolean
  prices: { localityId: number; price: number }[]
}

export interface TicketMatch {
  id: number
  tournament: TournamentSummary
  homeTeam: TeamSummary
  awayTeam: TeamSummary
  scheduledAt: string // "AAAA-MM-DDTHH:mm", hora local
  status: MatchStatus
  venue: VenueLocation | null
}

// Un boleto: partido + localidad + aficionado.
export interface Ticket {
  id: number
  code: string // "BOL-7F3K9Q2M": lo que se muestra en la entrada
  status: TicketStatus
  price: number // el de la localidad al comprarlo
  reference: string // la de la compra (la comparten los boletos de una misma compra)
  gatewayReference: string | null // la del pago en la pasarela (ref_payco), cuando ya se confirmó
  paymentDetail: string | null // por qué la pasarela no aprobó el pago o lo dejó pendiente
  match: TicketMatch
  locality: { id: number; name: string }
  fan: { id: number; email: string }
  paymentMethod: { id: number; name: string; alias: string | null; lastFour: string | null; phone: string | null }
  createdAt: string
  paidAt: string | null
  closedAt: string | null
}

// La venta de un partido: cada localidad de su escenario con su precio, lo vendido y lo disponible.
export function findMatchTicketing(matchId: number): Promise<MatchTicketing> {
  return request<MatchTicketing>(`/deportiva/matches/${matchId}/ticketing`)
}

// Solo con el partido programado y con escenario. Una localidad con boletos no se quita de la venta.
export function configureMatchTicketing(matchId: number, input: TicketingInput): Promise<MatchTicketing> {
  return request<MatchTicketing>(`/deportiva/matches/${matchId}/ticketing`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

// Administrador: los boletos de un partido, en el orden en que se compraron.
export function findTicketsByMatch(matchId: number): Promise<Ticket[]> {
  return request<Ticket[]>(`/deportiva/tickets/matches/${matchId}`)
}

// ---------- Lo del aficionado ----------

// Una localidad que se puede comprar en un partido.
export interface SaleLocality {
  id: number
  name: string
  price: number
  capacity: number
  available: number // 0: agotada
}

// Un partido que hoy vende boletos, con las localidades que vende (por nombre).
export interface TicketSale {
  match: Match
  localities: SaleLocality[]
}

// Una compra: sus boletos (comparten la referencia) y cómo quedó el pago.
export interface TicketPurchase {
  reference: string
  status: TicketStatus
  quantity: number
  unitPrice: number
  total: number
  gateway: string // con qué pasarela se cobró: "simulada" o "ePayco"
  // Solo al comprar, si el pago quedó pendiente: lo que pide la pasarela para abrirse. En ePayco,
  // { sessionId, test }.
  checkout: { sessionId?: string; test?: boolean } | null
  detail: string | null // lo que dijo la pasarela si no aprobó el pago o lo dejó pendiente
  tickets: Ticket[]
}

export interface BuyInput {
  matchId: number
  localityId: number
  quantity: number
  fanPaymentMethodId: number
}

// Los partidos que hoy venden boletos, por fecha.
export function findTicketSales(): Promise<TicketSale[]> {
  return request<TicketSale[]>('/deportiva/ticketing/matches')
}

// Los míos, del más reciente al más antiguo.
export function findMyTickets(): Promise<Ticket[]> {
  return request<Ticket[]>('/deportiva/tickets')
}

// Todo o nada: si no alcanza el cupo, la venta está cerrada o la pasarela rechaza el pago, no queda
// ningún boleto y el mensaje dice por qué. Con la pasarela simulada el pago se aprueba al instante; con
// ePayco queda PENDIENTE y checkout trae lo que necesita su ventana de pago.
export function buyTickets(input: BuyInput): Promise<TicketPurchase> {
  return request<TicketPurchase>('/deportiva/tickets', { method: 'POST', body: JSON.stringify(input) })
}

// Le pregunta a la pasarela cómo quedó el pago de una compra, con la referencia que la pasarela le dio al
// pagar (ref_payco en ePayco). Sin ella, usa la que ya quedó guardada. Confirmar dos veces no cobra ni
// envía nada de nuevo.
export function confirmPayment(reference: string, gatewayReference?: string): Promise<TicketPurchase> {
  return request<TicketPurchase>(`/deportiva/tickets/payments/${encodeURIComponent(reference)}/confirm`, {
    method: 'POST',
    body: JSON.stringify(gatewayReference ? { gatewayReference } : {}),
  })
}
