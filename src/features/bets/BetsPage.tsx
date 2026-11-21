import { CircleAlert, CreditCard, ListChecks, Ticket, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cancelBet, findBettingMatches, findMyBets, type Bet, type BetSelection } from '../../api/bets'
import { errorMessage } from '../../api/client'
import { findMyPaymentMethods } from '../../api/fanPaymentMethods'
import type { Match } from '../../api/matches'
import { canOpenPage, RESOURCES, useAccess } from '../../auth/access'
import type { ActionError } from '../../components/ActionAlert'
import { SubjectVisual } from '../../components/ConfirmDialog'
import { ListPanel } from '../../components/ListView'
import { PageHeading } from '../../components/PageHeading'
import { TeamMonogram } from '../../components/TeamMonogram'
import { useConfirm } from '../../hooks/useConfirm'
import { useLoadList } from '../../hooks/useLoadList'
import { useToast } from '../../hooks/useToast'
import { formatMoney, formatOdds } from '../../utils/money'
import { matchTitle } from '../matches/matchInfo'
import { usable } from '../payment-methods/paymentMethodInfo'
import { BetFormDialog, type BetFormTarget } from './BetFormDialog'
import { betsSentence, selectionLabel } from './betInfo'
import { BettingMatchCard } from './BettingMatchCard'
import { MyBetsTable } from './MyBetsTable'
import '../../components/ListPage.css'
import '../../components/Vivid.css'
import '../matches/Matches.css'
import './Bets.css'

// Pantalla "Apuestas" (HU-GC-11, del rol Aficionado): arriba, los partidos que hoy reciben apuestas con
// sus cuotas; abajo, sus apuestas con lo que pagan o pagaron. Cada aficionado ve solo las suyas.
export function BetsPage() {
  const { can } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const { showToast, toast } = useToast()
  const matchesList = useLoadList(findBettingMatches)
  const betsList = useLoadList(findMyBets)
  // Para apostar hay que elegir uno de sus métodos de pago.
  const canListMethods = can(RESOURCES.fanPaymentMethods, 'LIST')
  const methodsList = useLoadList(findMyPaymentMethods, canListMethods)
  const canBet = can(RESOURCES.bets, 'CREATE') && canListMethods
  const canChange = can(RESOURCES.bets, 'UPDATE')

  const [form, setForm] = useState<BetFormTarget | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<ActionError | null>(null)

  const bets = betsList.items
  const methods = useMemo(() => methodsList.items.filter(usable), [methodsList.items])
  const noMethods = canBet && !methodsList.loading && !methodsList.loadError && methods.length === 0
  const lockedReason = noMethods ? 'Primero agrega un método de pago activo' : null

  // Las apuestas pendientes de cada partido, para decirlo en su tarjeta.
  const pendingByMatch = useMemo(() => {
    const byMatch = new Map<number, Bet[]>()
    for (const bet of bets) {
      if (bet.status !== 'PENDIENTE') continue
      byMatch.set(bet.match.id, [...(byMatch.get(bet.match.id) ?? []), bet])
    }
    return byMatch
  }, [bets])

  const finding =
    betsList.loading || matchesList.loading
      ? 'Cargando tus apuestas…'
      : betsList.loadError
        ? 'No se pudieron cargar tus apuestas.'
        : betsSentence(bets, matchesList.items.length)

  function openBet(match: Match, selection: BetSelection) {
    setActionError(null)
    setForm({ match, selection })
  }

  async function cancel(bet: Bet) {
    const choice = selectionLabel(bet.selection, bet.match)
    const confirmed = await confirm({
      title: '¿Cancelar la apuesta?',
      message: `Se te devuelven ${formatMoney(bet.amount)} y la apuesta queda cancelada. No se puede deshacer.`,
      confirmLabel: 'Cancelar apuesta',
      cancelLabel: 'Volver',
      subject: (
        <SubjectVisual
          visual={<TeamMonogram team={bet.match.homeTeam} size="sm" />}
          name={matchTitle(bet.match)}
          detail={`${choice} · ${formatMoney(bet.amount)} · cuota ${formatOdds(bet.odds)}`}
        />
      ),
    })
    if (!confirmed) return
    setBusyId(bet.id)
    setActionError(null)
    try {
      const saved = await cancelBet(bet.id)
      betsList.setItems((list) => list.map((item) => (item.id === saved.id ? saved : item)))
      showToast(`Apuesta cancelada: se te devuelven ${formatMoney(saved.payout ?? bet.amount)}.`)
    } catch (err) {
      setActionError({ title: 'No se pudo cancelar la apuesta', message: errorMessage(err) })
      betsList.reload()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page page--vivid bets-page">
      <PageHeading icon={Ticket} title="Apuestas" finding={finding} />

      {noMethods && (
        <p className="bets-notice" role="status">
          <CreditCard size={18} aria-hidden="true" />
          <span>Para apostar necesitas un método de pago activo.</span>
          {canOpenPage('mis-metodos-pago', can) && (
            <a className="text-action" href="#mis-metodos-pago">
              Ir a Mis métodos de pago
            </a>
          )}
        </p>
      )}
      {methodsList.loadError && (
        <p className="inline-error" role="alert">
          <CircleAlert size={16} aria-hidden="true" />
          <span>No se pudieron cargar tus métodos de pago: {methodsList.loadError}</span>
          <button type="button" className="text-action" onClick={methodsList.retry}>
            Reintentar
          </button>
        </p>
      )}

      <ListPanel
        title="Partidos para apostar"
        titleId="betting-matches-title"
        icon={Trophy}
        noun={['partido abierto', 'partidos abiertos']}
        total={matchesList.items.length}
        loading={matchesList.loading}
        loadError={matchesList.loadError}
        onRetry={matchesList.retry}
        emptyMessage={
          matchesList.items.length > 0
            ? null
            : 'Hoy no hay partidos abiertos para apostar. Aparecen aquí cuando el administrador fija sus cuotas.'
        }
      >
        <ul className="bet-cards">
          {matchesList.items.map((match, index) => (
            <BettingMatchCard
              key={match.id}
              match={match}
              index={index}
              mine={pendingByMatch.get(match.id) ?? []}
              canBet={canBet}
              lockedReason={lockedReason}
              onBet={openBet}
            />
          ))}
        </ul>
      </ListPanel>

      <ListPanel
        title="Mis apuestas"
        titleId="my-bets-title"
        icon={ListChecks}
        noun={['apuesta', 'apuestas']}
        total={bets.length}
        loading={betsList.loading}
        loadError={betsList.loadError}
        onRetry={betsList.retry}
        error={actionError}
        onDismissError={() => setActionError(null)}
        emptyMessage={
          bets.length > 0
            ? null
            : canBet
              ? 'Todavía no tienes apuestas: toca una cuota de los partidos de arriba para apostar.'
              : 'Todavía no tienes apuestas.'
        }
      >
        <MyBetsTable
          bets={bets}
          busyId={busyId}
          onEdit={canChange && canListMethods ? (bet) => setForm({ bet }) : undefined}
          onCancel={canChange ? cancel : undefined}
        />
      </ListPanel>

      {form && (
        <BetFormDialog
          target={form}
          methods={methods}
          onClose={() => setForm(null)}
          onSaved={(saved, isNew) => {
            setForm(null)
            setActionError(null)
            betsList.setItems((list) =>
              isNew ? [saved, ...list] : list.map((item) => (item.id === saved.id ? saved : item)),
            )
            showToast(
              isNew
                ? `Apuesta registrada: ${formatMoney(saved.amount)} por ${selectionLabel(saved.selection, saved.match)}.`
                : 'Cambios guardados.',
            )
          }}
        />
      )}
      {confirmDialog}
      {toast}
    </div>
  )
}
