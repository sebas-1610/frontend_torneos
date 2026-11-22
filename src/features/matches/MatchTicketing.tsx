import { Ticket as TicketIcon } from 'lucide-react'
import { useCallback, useState } from 'react'
import type { Match } from '../../api/matches'
import { findMatchTicketing, findTicketsByMatch, type MatchTicketing as Ticketing } from '../../api/tickets'
import { DetailSection } from '../../components/DetailPanel'
import { useLoad } from '../../hooks/useLoad'
import { useLoadList } from '../../hooks/useLoadList'
import { formatMoney } from '../../utils/money'
import { plural } from '../../utils/plural'
import { TicketStatusTag } from '../tickets/TicketStatusTag'
import { TicketingDialog } from './TicketingDialog'

// Lo que la sesión puede hacer con la venta de entradas de un partido; lo decide la pantalla con los
// permisos.
export interface TicketingAbilities {
  view: boolean // ver los precios, lo vendido y lo disponible de cada localidad
  configure: boolean // fijar los precios y abrir o cerrar la venta
  listTickets: boolean // ver los boletos vendidos
}

interface MatchTicketingProps {
  match: Match
  abilities: TicketingAbilities
  onToast: (message: string) => void
}

// Boletos que se ven de entrada; el resto, con "Ver todos".
const SHOWN_TICKETS = 6

// "Venta de entradas" en el detalle de un partido (HU-GE-04, lo del administrador): el precio de cada
// localidad de su escenario, lo vendido y lo disponible, si está en venta, y los boletos vendidos. La
// venta se configura mientras el partido está programado y tiene escenario.
export function MatchTicketing({ match, abilities, onToast }: MatchTicketingProps) {
  const [editing, setEditing] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const hasVenue = match.venue !== null
  const fetchTicketing = useCallback(() => findMatchTicketing(match.id), [match.id])
  const ticketingLoad = useLoad(fetchTicketing, abilities.view && hasVenue)
  const fetchTickets = useCallback(() => findTicketsByMatch(match.id), [match.id])
  const ticketsList = useLoadList(fetchTickets, abilities.listTickets && hasVenue)
  if (!abilities.view && !abilities.listTickets) return null

  const ticketing = ticketingLoad.data
  const programmed = match.status === 'PROGRAMADO'
  const editable = abilities.configure && programmed && hasVenue && ticketing !== null
  // Lo que se muestra de cada localidad: las activas y las que tienen precio (aunque ya no estén activas).
  const localities = ticketing?.localities.filter((locality) => locality.active || locality.price !== null) ?? []
  const priced = localities.filter((locality) => locality.price !== null)

  // Lo más reciente primero (el backend los da en el orden en que se compraron).
  const tickets = [...ticketsList.items].reverse()
  const paid = tickets.filter((ticket) => ticket.status === 'PAGADO')
  const pending = tickets.filter((ticket) => ticket.status === 'PENDIENTE').length
  const collected = paid.reduce((total, ticket) => total + ticket.price, 0)
  const shown = showAll ? tickets : tickets.slice(0, SHOWN_TICKETS)

  return (
    <DetailSection
      title="Venta de entradas"
      action={
        editable && (
          <button type="button" className="button button--text detail__add" onClick={() => setEditing(true)}>
            <TicketIcon size={16} aria-hidden="true" />
            Configurar venta
          </button>
        )
      }
    >
      {!hasVenue ? (
        <p className="detail__empty">
          {programmed
            ? 'El partido todavía no tiene escenario: asígnale uno con "Editar" para vender entradas.'
            : 'Este partido no tuvo escenario ni venta de entradas.'}
        </p>
      ) : (
        abilities.view &&
        (ticketingLoad.loading ? (
          <p className="detail__empty">Cargando la venta…</p>
        ) : ticketingLoad.loadError || !ticketing ? (
          <p className="detail__empty">
            No se pudo cargar la venta: {ticketingLoad.loadError}{' '}
            <button type="button" className="text-action" onClick={ticketingLoad.retry}>
              Reintentar
            </button>
          </p>
        ) : (
          <>
            <p className="ticket-state">
              <span className={`pill ${ticketing.onSale ? 'pill--positive' : 'pill--neutral'}`}>
                <span className="status-dot" aria-hidden="true" />
                {ticketing.onSale ? 'En venta' : 'Venta cerrada'}
              </span>
              <span className="ticket-state__why">{saleNote(ticketing, match, priced.length)}</span>
            </p>

            {localities.length === 0 ? (
              <p className="detail__empty">
                {match.venue?.name} no tiene localidades activas: agrégalas en Escenarios para vender entradas.
              </p>
            ) : (
              <ul className="ticket-board" aria-label="Localidades">
                {localities.map((locality) => {
                  const share = locality.capacity > 0 ? Math.min(1, locality.sold / locality.capacity) : 0
                  const selling = locality.price !== null
                  return (
                    <li key={locality.id} className={`ticket-board__row${selling ? '' : ' is-off'}`}>
                      <span className="ticket-board__top">
                        <span className="ticket-board__name">
                          {locality.name}
                          {!locality.active && <span className="ticket-board__flag"> · desactivada</span>}
                        </span>
                        <span className="ticket-board__price num">
                          {selling ? formatMoney(locality.price as number) : 'No se vende'}
                        </span>
                      </span>
                      {selling && (
                        <>
                          <span
                            className="meter ticket-board__meter"
                            role="img"
                            aria-label={`${locality.sold} de ${locality.capacity} puestos vendidos`}
                          >
                            <span style={{ transform: `scaleX(${share})` }} />
                          </span>
                          <span className="ticket-board__detail num">
                            {locality.sold.toLocaleString('es-CO')} de {locality.capacity.toLocaleString('es-CO')}{' '}
                            vendidos ·{' '}
                            {locality.available === 0 ? (
                              <strong className="ticket-board__soldout">Agotada</strong>
                            ) : (
                              `${locality.available.toLocaleString('es-CO')} disponibles`
                            )}
                          </span>
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        ))
      )}

      {hasVenue &&
        abilities.listTickets &&
        (ticketsList.loading ? (
          <p className="detail__empty">Cargando boletos…</p>
        ) : ticketsList.loadError ? (
          <p className="detail__empty">
            No se pudieron cargar los boletos: {ticketsList.loadError}{' '}
            <button type="button" className="text-action" onClick={ticketsList.retry}>
              Reintentar
            </button>
          </p>
        ) : tickets.length === 0 ? (
          (priced.length > 0 || !abilities.view) && (
            <p className="detail__empty">Todavía nadie ha comprado boletos para este partido.</p>
          )
        ) : (
          <>
            <h4 className="ticket-sold__title">Boletos vendidos</h4>
            <p className="match-bets__total num">
              {plural(paid.length, 'pagado', 'pagados')} · {formatMoney(collected)} recaudados
              {pending > 0 && ` · ${plural(pending, 'pendiente', 'pendientes')}`}
            </p>
            <ul className="match-bets" aria-label={`Boletos de ${match.homeTeam.name} vs ${match.awayTeam.name}`}>
              {shown.map((ticket) => (
                <li key={ticket.id} className="match-bets__row">
                  <span className="match-bets__text">
                    <span className="ticket-sold__code">{ticket.code}</span>
                    <span className="match-bets__detail">
                      <span className="ticket-sold__fan">{ticket.fan.email}</span> · {ticket.locality.name} ·{' '}
                      <span className="num">{formatMoney(ticket.price)}</span>
                    </span>
                  </span>
                  <TicketStatusTag status={ticket.status} />
                </li>
              ))}
            </ul>
            {tickets.length > SHOWN_TICKETS && (
              <button type="button" className="text-action ticket-sold__more" onClick={() => setShowAll(!showAll)}>
                {showAll ? 'Ver menos' : `Ver los ${tickets.length} boletos`}
              </button>
            )}
          </>
        ))}

      {editing && ticketing && match.venue && (
        <TicketingDialog
          match={match}
          ticketing={ticketing}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setEditing(false)
            ticketingLoad.setData(saved)
            const selling = saved.localities.filter((locality) => locality.price !== null).length
            onToast(
              saved.open
                ? `Venta abierta: ${plural(selling, 'localidad', 'localidades')} a la venta.`
                : 'Venta cerrada: los boletos vendidos siguen igual.',
            )
          }}
        />
      )}
    </DetailSection>
  )
}

// Por qué está o no está en venta, en una frase.
function saleNote(ticketing: Ticketing, match: Match, priced: number): string {
  if (ticketing.onSale) return 'Se cierra sola a la hora del partido.'
  if (match.status !== 'PROGRAMADO') return 'El partido ya no está programado.'
  if (ticketing.open) return 'Ya llegó la hora del partido.'
  return priced === 0 ? 'Todavía no tiene precios.' : 'Los precios están fijados, pero la venta no está abierta.'
}
