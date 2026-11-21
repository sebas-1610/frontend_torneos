import { Ban, Pencil } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { Bet } from '../../api/bets'
import { RowAction, RowActions } from '../../components/ListView'
import { formatMoney, formatOdds } from '../../utils/money'
import { paymentLabel } from '../payment-methods/paymentMethodInfo'
import { BET_STATUSES, changeable, lockedReason, payoutText, selectionLabel } from './betInfo'
import { BetMatchLine } from './BetMatchLine'

interface MyBetsTableProps {
  bets: Bet[] // de la más reciente a la más antigua
  busyId: number | null
  // Llegan solo si la sesión puede cambiar sus apuestas. Si la apuesta ya no se puede cambiar (el partido
  // empezó o ya se liquidó), el botón sale apagado y su título dice por qué.
  onEdit?: (bet: Bet) => void
  onCancel?: (bet: Bet) => void
}

export function BetStatusTag({ bet }: { bet: Bet }) {
  const { label, tone } = BET_STATUSES[bet.status]
  return (
    <span className="tag" style={{ '--tag': tone } as CSSProperties}>
      {label}
    </span>
  )
}

// "Mis apuestas" (HU-GC-11): el partido, por quién y con qué cuota, cuánto, lo que paga o pagó y su estado.
export function MyBetsTable({ bets, busyId, onEdit, onCancel }: MyBetsTableProps) {
  return (
    <div className="table-scroll">
      <table className="data-table data-table--rows bets-table">
        <thead>
          <tr>
            <th>Partido</th>
            <th className="data-table__optional">Apuesta</th>
            <th className="data-table__optional">Valor</th>
            <th className="data-table__optional">Pago</th>
            <th className="data-table__optional">Estado</th>
            {(onEdit || onCancel) && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {bets.map((bet) => {
            const open = changeable(bet)
            const why = open ? null : lockedReason(bet)
            const busy = busyId === bet.id
            const choice = selectionLabel(bet.selection, bet.match)
            return (
              <tr key={bet.id} className={bet.status === 'ANULADA' || bet.status === 'CANCELADA' ? 'is-inactive' : undefined}>
                <td className="data-table__name">
                  <BetMatchLine match={bet.match} />
                  {/* En el celular las demás columnas se ocultan: la apuesta va aquí, debajo del partido. */}
                  <span className="bets-table__compact num">
                    <span>
                      {choice} · cuota {formatOdds(bet.odds)} · {formatMoney(bet.amount)}
                    </span>
                    <BetStatusTag bet={bet} />
                  </span>
                </td>
                <td className="data-table__optional">
                  <span className="cell-lines">
                    <span className="data-table__strong">{choice}</span>
                    <span className="cell-lines__detail num">Cuota {formatOdds(bet.odds)}</span>
                  </span>
                </td>
                <td className="data-table__optional">
                  <span className="cell-lines num">
                    <span>{formatMoney(bet.amount)}</span>
                    <span className="cell-lines__detail">{paymentLabel(bet.paymentMethod)}</span>
                  </span>
                </td>
                <td className="data-table__optional">
                  <span className={`bets-table__payout num${bet.status === 'GANADA' ? ' is-won' : ''}`}>
                    {payoutText(bet)}
                  </span>
                </td>
                <td className="data-table__optional">
                  <BetStatusTag bet={bet} />
                </td>
                {(onEdit || onCancel) && (
                  <RowActions>
                    {onEdit && (
                      <RowAction
                        icon={Pencil}
                        title={why ?? 'Cambiar valor o método de pago'}
                        label={`Editar la apuesta por ${choice}`}
                        disabled={busy || !open}
                        onClick={() => onEdit(bet)}
                      />
                    )}
                    {onCancel && (
                      <RowAction
                        icon={Ban}
                        tone="red"
                        title={why ?? 'Cancelar apuesta'}
                        label={`Cancelar la apuesta por ${choice}`}
                        disabled={busy || !open}
                        onClick={() => onCancel(bet)}
                      />
                    )}
                  </RowActions>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
