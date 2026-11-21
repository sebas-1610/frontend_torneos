import { Coins, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '../../api/client'
import { setMatchBetting, type Match } from '../../api/matches'
import { formatOdds } from '../../utils/money'
import { matchTitle } from './matchInfo'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'

interface OddsDialogProps {
  match: Match // programado
  onClose: () => void
  onSaved: (match: Match) => void
}

// "1,85" o "1.85" → 1.85; null si no es una cuota válida (entre 1,01 y 100, con máximo 2 decimales),
// la regla de MatchBettingDto.
function parseOdds(text: string): number | null {
  const clean = text.trim().replace(',', '.')
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(clean)) return null
  const value = Number(clean)
  return value >= 1.01 && value <= 100 ? value : null
}

const asText = (value: number | null | undefined) => (value === null || value === undefined ? '' : formatOdds(value))

// Fijar las cuotas de un partido y si recibe apuestas (HU-GC-11, lo del administrador). En una fase de
// grupos hay empate y su cuota es obligatoria; en una fase final no hay empate. Las apuestas ya hechas
// conservan su cuota.
export function OddsDialog({ match, onClose, onSaved }: OddsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const hasDraw = match.phase.type === 'GRUPOS'
  const [home, setHome] = useState(asText(match.betting?.homeOdds))
  const [draw, setDraw] = useState(asText(match.betting?.drawOdds))
  const [away, setAway] = useState(asText(match.betting?.awayOdds))
  // Un partido sin cuotas las recibe abiertas: es para lo que se fijan.
  const [open, setOpen] = useState(match.betting?.open ?? true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const homeOdds = parseOdds(home)
  const drawOdds = hasDraw ? parseOdds(draw) : null
  const awayOdds = parseOdds(away)
  const invalid = (text: string, value: number | null) => text.trim() !== '' && value === null
  const canSubmit = homeOdds !== null && awayOdds !== null && (!hasDraw || drawOdds !== null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || homeOdds === null || awayOdds === null) return
    setError(null)
    setSaving(true)
    try {
      onSaved(await setMatchBetting(match.id, { homeOdds, drawOdds, awayOdds, open }))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, value: string, onChange: (text: string) => void, placeholder: string) => (
    <label className="login__field">
      <span>{label}</span>
      <input
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, '').slice(0, 6))}
      />
    </label>
  )

  return (
    <dialog ref={dialogRef} className="form-dialog form-dialog--wide" onClose={onClose} aria-labelledby="odds-form-title">
      <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
        <div className="form-dialog__head">
          <span className="panel-head__icon" aria-hidden="true">
            <Coins size={16} />
          </span>
          <h2 id="odds-form-title" className="panel__title">
            Cuotas de {matchTitle(match)}
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

        <div className={`form-dialog__row${hasDraw ? ' odds-form__row' : ''}`}>
          {field(`Gana ${match.homeTeam.name}`, home, setHome, '1,85')}
          {hasDraw && field('Empate', draw, setDraw, '3,20')}
          {field(`Gana ${match.awayTeam.name}`, away, setAway, '4,50')}
        </div>
        {invalid(home, homeOdds) || invalid(draw, drawOdds) || invalid(away, awayOdds) ? (
          <p className="field-hint">Cada cuota debe ser un número entre 1,01 y 100, con máximo 2 decimales.</p>
        ) : (
          <p className="form-dialog__note">
            {hasDraw
              ? 'Fase de grupos: el partido puede terminar empatado, así que el empate lleva cuota.'
              : `${match.phase.name} es una fase final: no hay empate (se define por penales).`}{' '}
            Quien acierta recibe lo apostado × la cuota.
          </p>
        )}

        <label className="check-row">
          <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} />
          <span>
            <span className="check-row__label">Recibe apuestas</span>
            <span className="check-row__hint">
              Si lo apagas, se cierran las apuestas nuevas; las que ya están hechas siguen igual.
            </span>
          </span>
        </label>

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
            {saving ? 'Guardando…' : 'Guardar cuotas'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
