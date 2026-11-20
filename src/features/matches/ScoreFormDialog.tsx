import { Goal, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { errorMessage } from '../../api/client'
import type { Match } from '../../api/matches'
import type { PlayerSummary } from '../../api/players'
import { createScore, updateScore, type Score } from '../../api/scores'
import { effectiveEnd, findContractsByTeam, type Contract } from '../../api/teamPlayers'
import { TeamMonogram } from '../../components/TeamMonogram'
import { useLoad } from '../../hooks/useLoad'
import { formatDateShort } from '../../utils/dates'
import { fullNameOf } from '../players/playerName'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'

interface ScoreFormDialogProps {
  match: Match
  score: Score | null // null: registrar una nueva
  onClose: () => void
  onSaved: (score: Score, isNew: boolean) => void
}

// Jugadores con contrato con el equipo el día del partido (la regla del backend: hadContractOn), por
// apellido. Un mismo jugador puede tener dos contratos con el equipo: sale una vez.
function playersOn(contracts: Contract[], day: string): PlayerSummary[] {
  const byId = new Map<number, PlayerSummary>()
  for (const contract of contracts) {
    if (contract.startDate <= day && effectiveEnd(contract) >= day) byId.set(contract.player.id, contract.player)
  }
  return [...byId.values()].sort(
    (a, b) => a.lastName.localeCompare(b.lastName, 'es') || a.firstName.localeCompare(b.firstName, 'es'),
  )
}

function wholeBetween(value: string, min: number, max: number): number | null {
  const number = Number(value)
  return value.trim() !== '' && Number.isInteger(number) && number >= min && number <= max ? number : null
}

// Registrar o editar una anotación (HU-GC-07): de qué equipo, quién, en qué minuto y cuánto sumó.
export function ScoreFormDialog({ match, score, onClose, onSaved }: ScoreFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isNew = score === null
  const day = match.scheduledAt.slice(0, 10)
  const [teamId, setTeamId] = useState(score?.team.id ?? match.homeTeam.id)
  const [playerId, setPlayerId] = useState<number | null>(score?.player.id ?? null)
  const [minute, setMinute] = useState(score ? String(score.minute) : '')
  const [points, setPoints] = useState(score ? String(score.points) : '1')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  // Los contratos de los dos equipos, de una vez.
  const fetchContracts = useCallback(
    () => Promise.all([findContractsByTeam(match.homeTeam.id), findContractsByTeam(match.awayTeam.id)]),
    [match.homeTeam.id, match.awayTeam.id],
  )
  const contracts = useLoad(fetchContracts)
  const players = useMemo(() => {
    if (!contracts.data) return []
    const [home, away] = contracts.data
    return playersOn(teamId === match.homeTeam.id ? home : away, day)
  }, [contracts.data, teamId, match.homeTeam.id, day])

  const team = teamId === match.homeTeam.id ? match.homeTeam : match.awayTeam
  const minuteNumber = wholeBetween(minute, 1, 200)
  const pointsNumber = wholeBetween(points, 1, 10)
  // Con resultado oficial, lo que suman las anotaciones del equipo no puede pasar su marcador.
  const official = match.result
    ? teamId === match.homeTeam.id
      ? match.result.homeScore
      : match.result.awayScore
    : null
  const current = teamId === match.homeTeam.id ? match.liveScore.home : match.liveScore.away
  const own = score && score.team.id === teamId ? score.points : 0
  const overOfficial = official !== null && pointsNumber !== null && current - own + pointsNumber > official
  const canSubmit =
    playerId !== null &&
    players.some((player) => player.id === playerId) &&
    minuteNumber !== null &&
    pointsNumber !== null &&
    !overOfficial

  function chooseTeam(id: number) {
    setTeamId(id)
    setPlayerId(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || playerId === null || minuteNumber === null || pointsNumber === null) return
    setError(null)
    setSaving(true)
    const input = { teamId, playerId, minute: minuteNumber, points: pointsNumber }
    try {
      onSaved(isNew ? await createScore(match.id, input) : await updateScore(score.id, input), isNew)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="form-dialog form-dialog--wide" onClose={onClose} aria-labelledby="score-form-title">
      <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
        <div className="form-dialog__head">
          <span className="panel-head__icon" aria-hidden="true">
            <Goal size={16} />
          </span>
          <h2 id="score-form-title" className="panel__title">
            {isNew ? 'Nueva anotación' : 'Editar anotación'}
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

        <fieldset className="type-choice">
          <legend className="type-choice__legend">Equipo</legend>
          <div className="type-choice__options">
            {[
              { team: match.homeTeam, role: 'Local' },
              { team: match.awayTeam, role: 'Visitante' },
            ].map(({ team: option, role }) => (
              <label
                key={option.id}
                className={`type-choice__option${teamId === option.id ? ' is-checked' : ''}`}
                style={{ '--tag': 'var(--tone-blue)' } as CSSProperties}
              >
                <input
                  type="radio"
                  name="score-team"
                  value={option.id}
                  checked={teamId === option.id}
                  onChange={() => chooseTeam(option.id)}
                />
                <TeamMonogram team={option} size="md" />
                <span className="type-choice__text">
                  <span className="type-choice__label">{option.name}</span>
                  <span className="type-choice__description">{role}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="login__field">
          <span>Jugador</span>
          <select
            value={playerId ?? ''}
            disabled={contracts.loading || players.length === 0}
            onChange={(e) => setPlayerId(e.target.value === '' ? null : Number(e.target.value))}
          >
            <option value="" disabled>
              {contracts.loading ? 'Cargando jugadores…' : 'Elige un jugador'}
            </option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {fullNameOf(player)}
                {player.position ? ` · ${player.position}` : ''}
              </option>
            ))}
          </select>
        </label>
        {contracts.loadError ? (
          <p className="login__error" role="alert">
            No se pudieron cargar los jugadores: {contracts.loadError}
          </p>
        ) : !contracts.loading && players.length === 0 ? (
          <p className="field-hint">
            Ningún jugador tenía contrato con {team.name} el {formatDateShort(day)}: asígnalo en la Plantilla del equipo.
          </p>
        ) : (
          <p className="form-dialog__note">Solo aparecen los jugadores con contrato con {team.name} el día del partido.</p>
        )}

        <div className="form-dialog__row">
          <label className="login__field">
            <span>Minuto</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={200}
              placeholder="Ej: 37"
              value={minute}
              onChange={(e) => setMinute(e.target.value)}
            />
          </label>
          <label className="login__field">
            <span>Puntos que suma</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={10}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
          </label>
        </div>
        {minute !== '' && minuteNumber === null && (
          <p className="field-hint">El minuto debe ser un número entero entre 1 y 200.</p>
        )}
        {pointsNumber === null ? (
          <p className="field-hint">Los puntos deben ser un número entero entre 1 y 10.</p>
        ) : overOfficial ? (
          <p className="field-hint">
            Con esta anotación, las de {team.name} sumarían {current - own + pointsNumber} y su marcador oficial es{' '}
            {official}: corrige primero el resultado.
          </p>
        ) : (
          <p className="form-dialog__note">Un gol suma 1; en baloncesto, 1, 2 o 3. Los autogoles no se registran.</p>
        )}

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
            {saving ? 'Guardando…' : 'Guardar anotación'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
