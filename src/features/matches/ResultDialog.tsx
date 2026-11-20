import { ClipboardCheck, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '../../api/client'
import { registerResult, type Match } from '../../api/matches'
import { TeamMonogram } from '../../components/TeamMonogram'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'
import './Matches.css'

interface ResultDialogProps {
  match: Match // en juego (registrar) o finalizado (corregir)
  onClose: () => void
  onSaved: (match: Match) => void
}

// Un entero dentro del rango, o null si lo escrito no sirve.
function wholeIn(value: string, max: number): number | null {
  const number = Number(value)
  return value.trim() !== '' && Number.isInteger(number) && number >= 0 && number <= max ? number : null
}

// El resultado oficial de un partido (HU-GC-07): lo confirma el administrador al terminar. Empieza con
// lo que suman las anotaciones (o con el resultado que tenía, al corregir). Los penales solo aparecen en
// una fase final empatada.
export function ResultDialog({ match, onClose, onSaved }: ResultDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const correcting = match.result !== null
  const start = match.result
    ? { home: match.result.homeScore, away: match.result.awayScore }
    : { home: match.liveScore.home, away: match.liveScore.away }
  const [home, setHome] = useState(String(start.home))
  const [away, setAway] = useState(String(start.away))
  const [homePens, setHomePens] = useState(match.result?.homePenalties?.toString() ?? '')
  const [awayPens, setAwayPens] = useState(match.result?.awayPenalties?.toString() ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  // Mismas reglas del backend (RegisterResultDto y MatchResultsService).
  const homeScore = wholeIn(home, 999)
  const awayScore = wholeIn(away, 999)
  const homePenalties = wholeIn(homePens, 99)
  const awayPenalties = wholeIn(awayPens, 99)
  const tied = homeScore !== null && homeScore === awayScore
  const needsPenalties = match.phase.type === 'FINAL' && tied
  const belowLive = (homeScore !== null && homeScore < match.liveScore.home) || (awayScore !== null && awayScore < match.liveScore.away)
  const penaltiesTied = needsPenalties && homePenalties !== null && homePenalties === awayPenalties
  const canSubmit =
    homeScore !== null &&
    awayScore !== null &&
    !belowLive &&
    (!needsPenalties || (homePenalties !== null && awayPenalties !== null && !penaltiesTied))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || homeScore === null || awayScore === null) return
    setError(null)
    setSaving(true)
    try {
      onSaved(
        await registerResult(match.id, {
          homeScore,
          awayScore,
          homePenalties: needsPenalties ? homePenalties : null,
          awayPenalties: needsPenalties ? awayPenalties : null,
        }),
      )
    } catch (err) {
      // ej: 400 "ya no se puede corregir: sus apuestas ya se liquidaron"
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const side = (team: Match['homeTeam'], label: string, value: string, onChange: (value: string) => void) => (
    <label className="result-side">
      <TeamMonogram team={team} size="md" />
      <span className="result-side__name">{team.name}</span>
      <span className="result-side__role">{label}</span>
      <input
        className="result-side__input"
        type="number"
        inputMode="numeric"
        min={0}
        max={999}
        aria-label={`Marcador de ${team.name}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )

  return (
    <dialog ref={dialogRef} className="form-dialog" onClose={onClose} aria-labelledby="result-form-title">
      <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
        <div className="form-dialog__head">
          <span className="panel-head__icon" aria-hidden="true">
            <ClipboardCheck size={16} />
          </span>
          <h2 id="result-form-title" className="panel__title">
            {correcting ? 'Corregir resultado' : 'Registrar resultado'}
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

        <div className="result-grid">
          {side(match.homeTeam, 'Local', home, setHome)}
          <span className="result-grid__dash" aria-hidden="true">
            –
          </span>
          {side(match.awayTeam, 'Visitante', away, setAway)}
        </div>
        <p className="form-dialog__note">
          Las anotaciones suman {match.liveScore.home} – {match.liveScore.away}: el marcador de cada equipo no puede ser
          menor.
        </p>
        {belowLive && (
          <p className="field-hint">
            El marcador no puede ser menor a lo que suman las anotaciones. Corrige o elimina anotaciones primero.
          </p>
        )}

        {needsPenalties && (
          <>
            <p className="result-pens__title">Empate en una fase final: ¿cómo quedaron los penales?</p>
            <div className="form-dialog__row">
              <label className="login__field">
                <span>Penales de {match.homeTeam.name}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99}
                  value={homePens}
                  onChange={(e) => setHomePens(e.target.value)}
                />
              </label>
              <label className="login__field">
                <span>Penales de {match.awayTeam.name}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99}
                  value={awayPens}
                  onChange={(e) => setAwayPens(e.target.value)}
                />
              </label>
            </div>
            {penaltiesTied && (
              <p className="field-hint">Los penales no pueden quedar empatados: en una fase final siempre hay un ganador.</p>
            )}
          </>
        )}
        {match.phase.type === 'GRUPOS' && tied && (
          <p className="form-dialog__note">En la fase de grupos el empate vale 1 punto para cada equipo.</p>
        )}

        <p className="form-dialog__note">
          {correcting
            ? 'Se puede corregir mientras ninguna fase posterior tenga partidos y sus apuestas no se hayan liquidado.'
            : 'Al guardarlo, el partido queda finalizado y se liquidan sus apuestas.'}
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
            {saving ? 'Guardando…' : 'Guardar resultado'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
