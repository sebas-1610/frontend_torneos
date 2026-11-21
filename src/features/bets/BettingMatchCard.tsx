import { CalendarDays, Ticket } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { Bet, BetSelection } from '../../api/bets'
import type { Match } from '../../api/matches'
import { formatMoney, formatOdds } from '../../utils/money'
import { matchPlace, matchWhen } from '../matches/matchInfo'
import { MatchVersus } from '../matches/MatchVisuals'
import { SELECTION_ROLES, selectionLabel, selectionsOf } from './betInfo'

interface BettingMatchCardProps {
  match: Match // recibe apuestas: trae sus cuotas (match.betting)
  index: number // para la entrada en cascada
  mine: Bet[] // las apuestas pendientes del aficionado en este partido
  canBet: boolean // la sesión puede apostar: las cuotas son botones
  lockedReason: string | null // por qué no puede apostar ahora (ej: sin método de pago)
  onBet: (match: Match, selection: BetSelection) => void
}

// Un partido abierto a apuestas: dónde y cuándo se juega, los dos escudos frente a frente y una casilla
// por resultado con su cuota. Al tocar una, se abre la apuesta con ese resultado elegido.
export function BettingMatchCard({ match, index, mine, canBet, lockedReason, onBet }: BettingMatchCardProps) {
  const when = matchWhen(match.scheduledAt)
  if (!match.betting) return null
  return (
    <li className="bet-card" style={{ '--i': index } as CSSProperties}>
      <div className="bet-card__head">
        <span className="bet-card__tournament">{match.tournament.name}</span>
        <span className="bet-card__when num">
          <CalendarDays size={14} aria-hidden="true" />
          {when.date} · {when.time}
        </span>
      </div>
      <p className="bet-card__place">{matchPlace(match)}</p>
      <MatchVersus match={match} />
      <div className="odds" role="group" aria-label={`Cuotas de ${match.homeTeam.name} vs ${match.awayTeam.name}`}>
        {selectionsOf(match.betting).map(({ selection, odds }) => {
          const label = selectionLabel(selection, match)
          const content = (
            <>
              <span className="odds__role">{SELECTION_ROLES[selection]}</span>
              <span className="odds__value num">{formatOdds(odds)}</span>
            </>
          )
          return canBet ? (
            <button
              key={selection}
              type="button"
              className="odds__option"
              disabled={lockedReason !== null}
              title={lockedReason ?? `Apostar por ${label} (cuota ${formatOdds(odds)})`}
              aria-label={`Apostar por ${label}, cuota ${formatOdds(odds)}`}
              onClick={() => onBet(match, selection)}
            >
              {content}
            </button>
          ) : (
            <span key={selection} className="odds__option is-static">
              {content}
            </span>
          )
        })}
      </div>
      {mine.length > 0 && (
        <p className="bet-card__mine">
          <Ticket size={14} aria-hidden="true" />
          {mine.length === 1
            ? `Tu apuesta: ${selectionLabel(mine[0].selection, match)} · ${formatMoney(mine[0].amount)}`
            : `Tienes ${mine.length} apuestas en este partido`}
        </p>
      )}
    </li>
  )
}
