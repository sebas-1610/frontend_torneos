import { Lock, Ticket, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { createBet, MAX_BET_AMOUNT, MIN_BET_AMOUNT, updateBet, type Bet, type BetSelection } from '../../api/bets'
import { errorMessage } from '../../api/client'
import type { FanPaymentMethod } from '../../api/fanPaymentMethods'
import type { Match } from '../../api/matches'
import { TeamMonogram } from '../../components/TeamMonogram'
import { formatMoney, formatOdds } from '../../utils/money'
import { fanMethodLabel } from '../payment-methods/paymentMethodInfo'
import { payoutFor, SELECTION_ROLES, selectionLabel, selectionsOf } from './betInfo'
import { BetMatchLine } from './BetMatchLine'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'

// Qué se abre: una apuesta nueva sobre un partido (con el resultado que se tocó) o una ya hecha.
export type BetFormTarget = { match: Match; selection: BetSelection } | { bet: Bet }

interface BetFormDialogProps {
  target: BetFormTarget
  methods: FanPaymentMethod[] // los que sirven para apostar (activos y sin vencer)
  onClose: () => void
  onSaved: (bet: Bet, isNew: boolean) => void
}

// Valores para elegir con un toque.
const PRESETS = [10_000, 20_000, 50_000, 100_000]

// Apostar o cambiar una apuesta (HU-GC-11). Nueva: se elige el resultado (con su cuota), el valor y el
// método de pago, y se ve cuánto recibiría si acierta. Ya hecha: solo cambian el valor y el método de
// pago; el resultado y la cuota quedaron fijos al apostar.
export function BetFormDialog({ target, methods, onClose, onSaved }: BetFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const bet = 'bet' in target ? target.bet : null
  const match = 'match' in target ? target.match : null
  const [selection, setSelection] = useState<BetSelection>(bet?.selection ?? ('selection' in target ? target.selection : 'LOCAL'))
  const [amount, setAmount] = useState(bet ? String(bet.amount) : '')
  // El que usó, si todavía sirve; si no, el primero que sirva.
  const [methodId, setMethodId] = useState<number | null>(
    methods.find((method) => method.id === bet?.paymentMethod.id)?.id ?? (bet ? null : (methods[0]?.id ?? null)),
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const options = match?.betting ? selectionsOf(match.betting) : []
  const odds = bet ? bet.odds : (options.find((option) => option.selection === selection)?.odds ?? null)
  const teams = bet?.match ?? match
  const value = Number(amount)
  const amountOk = amount !== '' && Number.isInteger(value) && value >= MIN_BET_AMOUNT && value <= MAX_BET_AMOUNT
  const canSubmit = amountOk && odds !== null && methodId !== null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || methodId === null) return
    setError(null)
    setSaving(true)
    const change = { amount: value, fanPaymentMethodId: methodId }
    try {
      if (bet) onSaved(await updateBet(bet.id, change), false)
      else if (match) onSaved(await createBet(match.id, selection, change), true)
    } catch (err) {
      setError(errorMessage(err)) // ej: "Las apuestas del partido ... están cerradas"
    } finally {
      setSaving(false)
    }
  }

  if (!teams) return null

  return (
    <dialog ref={dialogRef} className="form-dialog form-dialog--wide" onClose={onClose} aria-labelledby="bet-form-title">
      <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
        <div className="form-dialog__head">
          <span className="panel-head__icon" aria-hidden="true">
            <Ticket size={16} />
          </span>
          <h2 id="bet-form-title" className="panel__title">
            {bet ? 'Cambiar apuesta' : 'Nueva apuesta'}
          </h2>
          <button
            type="button"
            className="icon-button icon-button--small"
            aria-label="Cerrar"
            onClick={() => dialogRef.current?.close()}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="bet-form__match">
          <BetMatchLine match={teams} />
        </div>

        {bet ? (
          <p className="bet-form__fixed">
            <Lock size={14} aria-hidden="true" />
            Apostaste por <strong>{selectionLabel(bet.selection, bet.match)}</strong> con cuota{' '}
            <strong className="num">{formatOdds(bet.odds)}</strong>: eso no cambia.
          </p>
        ) : (
          <fieldset className="type-choice">
            <legend className="type-choice__legend">¿Quién gana?</legend>
            <div className={`type-choice__options bet-form__options${options.length === 3 ? ' has-three' : ''}`}>
              {options.map((option) => {
                const checked = option.selection === selection
                const team =
                  option.selection === 'LOCAL' ? teams.homeTeam : option.selection === 'VISITANTE' ? teams.awayTeam : null
                return (
                  <label
                    key={option.selection}
                    className={`type-choice__option bet-form__option${checked ? ' is-checked' : ''}`}
                    style={{ '--tag': 'var(--tone-blue)' } as CSSProperties}
                  >
                    <input
                      type="radio"
                      name="bet-selection"
                      value={option.selection}
                      checked={checked}
                      onChange={() => setSelection(option.selection)}
                    />
                    {team ? (
                      <TeamMonogram team={team} size="md" />
                    ) : (
                      <span className="bet-form__draw" aria-hidden="true">
                        =
                      </span>
                    )}
                    <span className="type-choice__text">
                      <span className="type-choice__label">{team ? team.name : 'Empate'}</span>
                      <span className="type-choice__description">
                        {team ? `${SELECTION_ROLES[option.selection]} · ` : ''}cuota{' '}
                        <span className="num">{formatOdds(option.odds)}</span>
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        )}

        <label className="login__field">
          <span>Valor de la apuesta (pesos)</span>
          <input
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ej: 20000"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 7))}
          />
        </label>
        <div className="bet-form__presets" role="group" aria-label="Valores rápidos">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`chip-button num${value === preset ? ' is-active' : ''}`}
              onClick={() => setAmount(String(preset))}
            >
              {formatMoney(preset)}
            </button>
          ))}
        </div>
        {amount !== '' && !amountOk && (
          <p className="field-hint">
            El valor debe ser un número entero de pesos entre {formatMoney(MIN_BET_AMOUNT)} y {formatMoney(MAX_BET_AMOUNT)}.
          </p>
        )}

        <label className="login__field">
          <span>Método de pago</span>
          <select value={methodId ?? ''} onChange={(e) => setMethodId(e.target.value === '' ? null : Number(e.target.value))}>
            <option value="" disabled>
              {methods.length === 0 ? 'No tienes métodos de pago que sirvan' : 'Elige uno de tus métodos de pago'}
            </option>
            {methods.map((method) => (
              <option key={method.id} value={method.id}>
                {fanMethodLabel(method)} · {method.paymentMethod.name}
              </option>
            ))}
          </select>
        </label>
        {bet && methodId === null && (
          <p className="field-hint">El método con que apostaste ya no sirve (desactivado o vencido): elige otro.</p>
        )}

        {/* Lo que importa de la apuesta: cuánto recibiría si acierta. */}
        <div className="bet-summary" aria-live="polite">
          <span className="bet-summary__label">Si aciertas recibes</span>
          <span className="bet-summary__value num">
            {amountOk && odds !== null ? formatMoney(payoutFor(value, odds)) : '—'}
          </span>
          <span className="bet-summary__detail num">
            {amountOk && odds !== null
              ? `${formatMoney(value)} × cuota ${formatOdds(odds)}`
              : 'Escribe el valor para ver cuánto recibirías.'}
          </span>
        </div>
        <p className="form-dialog__note">
          La cuota queda fija al apostar. Hasta que empiece el partido puedes cambiar el valor o el método de pago, o
          cancelar la apuesta (se devuelve lo apostado).
        </p>

        {error && (
          <p className="login__error" role="alert">
            {error}
          </p>
        )}

        <div className="form-dialog__actions">
          <button type="button" className="button button--outline" onClick={() => dialogRef.current?.close()}>
            Cancelar
          </button>
          <button type="submit" className="button button--primary" disabled={saving || !canSubmit}>
            {saving ? 'Guardando…' : bet ? 'Guardar cambios' : amountOk ? `Apostar ${formatMoney(value)}` : 'Apostar'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
