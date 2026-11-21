import { Coins } from 'lucide-react'
import { useCallback, useState } from 'react'
import { findBetsByMatch } from '../../api/bets'
import type { Match } from '../../api/matches'
import { DetailSection } from '../../components/DetailPanel'
import { useLoadList } from '../../hooks/useLoadList'
import { formatMoney, formatOdds } from '../../utils/money'
import { plural } from '../../utils/plural'
import { BetStatusTag } from '../bets/MyBetsTable'
import { SELECTION_ROLES, selectionLabel, selectionsOf } from '../bets/betInfo'
import { OddsDialog } from './OddsDialog'

// Lo que la sesión puede hacer con las apuestas de un partido; lo decide la pantalla con los permisos.
export interface BettingAbilities {
  setOdds: boolean // fijar cuotas y abrir o cerrar las apuestas
  listBets: boolean // ver las apuestas del partido
}

interface MatchBettingProps {
  match: Match
  abilities: BettingAbilities
  onSaved: (match: Match) => void // cambiaron sus cuotas
  onToast: (message: string) => void
}

// "Cuotas y apuestas" en el detalle de un partido (HU-GC-11, lo del administrador): sus cuotas, si
// recibe apuestas y las apuestas que tiene. Las cuotas se fijan mientras el partido está programado.
export function MatchBetting({ match, abilities, onSaved, onToast }: MatchBettingProps) {
  const [editing, setEditing] = useState(false)
  const fetchBets = useCallback(() => findBetsByMatch(match.id), [match.id])
  const betsList = useLoadList(fetchBets, abilities.listBets)
  if (!abilities.setOdds && !abilities.listBets) return null

  const { betting } = match
  const editable = abilities.setOdds && match.status === 'PROGRAMADO'
  // Recibe apuestas de verdad: abiertas y sin haber empezado.
  const receiving = betting !== null && betting.open && match.status === 'PROGRAMADO'
  const bets = betsList.items
  // Lo que sigue en juego: las canceladas y las anuladas ya se devolvieron.
  const refunded = bets.filter((bet) => bet.status === 'CANCELADA' || bet.status === 'ANULADA').length
  const staked = bets
    .filter((bet) => bet.status !== 'CANCELADA' && bet.status !== 'ANULADA')
    .reduce((total, bet) => total + bet.amount, 0)

  return (
    <DetailSection
      title="Cuotas y apuestas"
      action={
        editable && (
          <button type="button" className="button button--text detail__add" onClick={() => setEditing(true)}>
            <Coins size={16} aria-hidden="true" />
            {betting ? 'Cambiar cuotas' : 'Fijar cuotas'}
          </button>
        )
      }
    >
      {betting ? (
        <>
          <ul className="odds-board" aria-label="Cuotas">
            {selectionsOf(betting).map(({ selection, odds }) => (
              <li key={selection} className="odds-board__item">
                <span className="odds-board__role">{SELECTION_ROLES[selection]}</span>
                <span className="odds-board__value num">{formatOdds(odds)}</span>
              </li>
            ))}
          </ul>
          <p className="odds-board__state">
            <span className={`pill ${receiving ? 'pill--positive' : 'pill--neutral'}`}>
              <span className="status-dot" aria-hidden="true" />
              {receiving ? 'Recibe apuestas' : 'Apuestas cerradas'}
            </span>
          </p>
        </>
      ) : (
        <p className="detail__empty">
          {editable
            ? 'Todavía no tiene cuotas: fíjalas para que reciba apuestas.'
            : match.status === 'PROGRAMADO'
              ? 'Todavía no tiene cuotas.'
              : 'Este partido no tuvo cuotas.'}
        </p>
      )}

      {abilities.listBets &&
        (betsList.loading ? (
          <p className="detail__empty">Cargando apuestas…</p>
        ) : betsList.loadError ? (
          <p className="detail__empty">
            No se pudieron cargar las apuestas: {betsList.loadError}{' '}
            <button type="button" className="text-action" onClick={betsList.retry}>
              Reintentar
            </button>
          </p>
        ) : bets.length === 0 ? (
          betting && <p className="detail__empty">Todavía nadie ha apostado en este partido.</p>
        ) : (
          <>
            <p className="match-bets__total num">
              {plural(bets.length, 'apuesta', 'apuestas')} · {formatMoney(staked)} apostados
              {refunded > 0 && ` · ${plural(refunded, 'devuelta', 'devueltas')}`}
            </p>
            <ul className="match-bets" aria-label={`Apuestas de ${match.homeTeam.name} vs ${match.awayTeam.name}`}>
              {bets.map((bet) => (
                <li key={bet.id} className="match-bets__row">
                  <span className="match-bets__text">
                    <span className="match-bets__fan">{bet.fan.email}</span>
                    <span className="match-bets__detail num">
                      {selectionLabel(bet.selection, match)} · {formatMoney(bet.amount)} · cuota {formatOdds(bet.odds)}
                    </span>
                  </span>
                  <BetStatusTag bet={bet} />
                </li>
              ))}
            </ul>
          </>
        ))}

      {editing && (
        <OddsDialog
          match={match}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setEditing(false)
            onSaved(saved)
            onToast(saved.betting?.open ? 'Cuotas guardadas: el partido recibe apuestas.' : 'Cuotas guardadas: apuestas cerradas.')
          }}
        />
      )}
    </DetailSection>
  )
}
