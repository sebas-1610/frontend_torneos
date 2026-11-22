import { CalendarDays, MapPin, Tickets } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { TicketSale } from '../../api/tickets'
import { formatMoney } from '../../utils/money'
import { plural } from '../../utils/plural'
import { matchPlace, matchWhen } from '../matches/matchInfo'
import { MatchVersus } from '../matches/MatchVisuals'

interface TicketSaleCardProps {
  sale: TicketSale
  index: number // para la entrada en cascada
  mine: number // boletos pagados o pendientes que ya tiene para este partido
  canBuy: boolean
  lockedReason: string | null // por qué no puede comprar ahora (ej: sin método de pago)
  onBuy: (sale: TicketSale) => void
}

// Un partido que vende boletos: cuándo y dónde se juega, los dos equipos y cada localidad con su precio
// y lo que queda. El botón abre la compra.
export function TicketSaleCard({ sale, index, mine, canBuy, lockedReason, onBuy }: TicketSaleCardProps) {
  const { match, localities } = sale
  const when = matchWhen(match.scheduledAt)
  const soldOut = localities.every((locality) => locality.available === 0)

  return (
    <li className="bet-card sale-card" style={{ '--i': index } as CSSProperties}>
      <div className="bet-card__head">
        <span className="bet-card__tournament">{match.tournament.name}</span>
        <span className="bet-card__when num">
          <CalendarDays size={14} aria-hidden="true" />
          {when.date} · {when.time}
        </span>
      </div>
      <p className="bet-card__place">{matchPlace(match)}</p>
      <MatchVersus match={match} />
      {match.venue && (
        <p className="sale-card__venue">
          <MapPin size={14} aria-hidden="true" />
          <span>
            {match.venue.name}
            <span className="sale-card__city">
              {' '}
              · {match.venue.parentName ? `${match.venue.parentName}, ` : ''}
              {match.venue.city}
            </span>
          </span>
        </p>
      )}

      <ul className="sale-card__localities" aria-label="Localidades">
        {localities.map((locality) => (
          <li key={locality.id} className={`sale-card__locality${locality.available === 0 ? ' is-soldout' : ''}`}>
            <span className="sale-card__name">{locality.name}</span>
            <span className="sale-card__left num">
              {locality.available === 0 ? 'Agotada' : plural(locality.available, 'disponible', 'disponibles')}
            </span>
            <span className="sale-card__price num">{formatMoney(locality.price)}</span>
          </li>
        ))}
      </ul>

      {mine > 0 && (
        <p className="bet-card__mine">
          <Tickets size={14} aria-hidden="true" />
          {mine === 1 ? 'Ya tienes 1 boleto para este partido' : `Ya tienes ${mine} boletos para este partido`}
        </p>
      )}

      {canBuy && (
        <button
          type="button"
          className="button button--outline sale-card__buy"
          disabled={soldOut || lockedReason !== null}
          title={lockedReason ?? (soldOut ? 'No quedan boletos' : undefined)}
          onClick={() => onBuy(sale)}
        >
          <Tickets size={16} aria-hidden="true" />
          {soldOut ? 'Agotado' : 'Comprar boletos'}
        </button>
      )}
    </li>
  )
}
