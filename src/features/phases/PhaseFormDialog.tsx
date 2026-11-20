import { Layers, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { errorMessage } from '../../api/client'
import { createPhase, updatePhase, type Phase, type PhaseType } from '../../api/phases'
import { DEFAULT_QUALIFIERS, FINAL_ROUNDS, PHASE_TYPES, roundName } from './phaseInfo'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'
import './Phases.css'

// Lo que se propone al crear una fase, según la última del torneo (TournamentPhases).
export interface PhaseSuggestion {
  type: PhaseType
  teamsCount: number | null
}

interface PhaseFormDialogProps {
  tournamentId: number
  phase: Phase | null // null: crear una nueva
  suggestion: PhaseSuggestion
  onClose: () => void
  onSaved: (phase: Phase, isNew: boolean) => void
}

const TYPES: PhaseType[] = ['GRUPOS', 'FINAL']

// El nombre que se propone mientras no se escriba otro: "Fase de grupos" o el de la ronda ("Cuartos de final").
function suggestedName(type: PhaseType, teams: number | null): string {
  return type === 'GRUPOS' ? 'Fase de grupos' : teams === null ? '' : roundName(teams)
}

// Formulario de una fase (HU-GC-03 y 05). El tipo se elige al crearla y ya no cambia; el orden no se
// escribe: la fase nueva queda de última y se mueve con las flechas de la lista.
export function PhaseFormDialog({ tournamentId, phase, suggestion, onClose, onSaved }: PhaseFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isNew = phase === null
  const [type, setType] = useState<PhaseType>(phase?.type ?? suggestion.type)
  const [teams, setTeams] = useState<number | null>(phase?.teamsCount ?? suggestion.teamsCount)
  const [qualifiers, setQualifiers] = useState(String(phase?.qualifiersPerGroup ?? DEFAULT_QUALIFIERS))
  // Al crear, el nombre sigue al tipo y a la ronda hasta que se escribe uno propio.
  const [ownName, setOwnName] = useState<string | null>(phase?.name ?? null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const name = ownName ?? suggestedName(type, teams)
  // Mismas reglas que valida el backend (PhaseFieldsDto).
  const trimmedName = name.trim()
  const qualifiersNumber = Number(qualifiers)
  const qualifiersValid = Number.isInteger(qualifiersNumber) && qualifiersNumber >= 1 && qualifiersNumber <= 16
  const canSubmit =
    trimmedName.length >= 3 &&
    trimmedName.length <= 40 &&
    (type === 'GRUPOS' ? qualifiersValid : teams !== null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return
    setError(null)
    setLoading(true)
    const input = {
      type,
      name: trimmedName,
      qualifiersPerGroup: type === 'GRUPOS' ? qualifiersNumber : null,
      teamsCount: type === 'FINAL' ? teams : null,
    }
    try {
      onSaved(isNew ? await createPhase(tournamentId, input) : await updatePhase(phase.id, input), isNew)
    } catch (err) {
      // ej: 409 "El torneo ya tiene una fase llamada…", o 400 si la fase final ya tiene partidos
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="form-dialog form-dialog--wide" onClose={onClose} aria-labelledby="phase-form-title">
      <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
        <div className="form-dialog__head">
          <span className="panel-head__icon" aria-hidden="true">
            <Layers size={16} />
          </span>
          <h2 id="phase-form-title" className="panel__title">
            {isNew ? 'Nueva fase' : 'Editar fase'}
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

        <fieldset className="type-choice" disabled={!isNew}>
          <legend className="type-choice__legend">Tipo de fase</legend>
          <div className="type-choice__options">
            {TYPES.map((value) => {
              const info = PHASE_TYPES[value]
              const Icon = info.icon
              return (
                <label
                  key={value}
                  className={`type-choice__option${type === value ? ' is-checked' : ''}`}
                  style={{ '--tag': info.tone } as CSSProperties}
                >
                  <input
                    type="radio"
                    name="phase-type"
                    value={value}
                    checked={type === value}
                    onChange={() => setType(value)}
                  />
                  <span className="type-choice__icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className="type-choice__text">
                    <span className="type-choice__label">{info.label}</span>
                    <span className="type-choice__description">{info.description}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
        {!isNew && (
          <p className="form-dialog__note">
            El tipo de una fase no se cambia: si quedó mal, elimínala y créala de nuevo.
          </p>
        )}

        <div className="form-dialog__row">
          <label className="login__field">
            <span>Nombre de la fase</span>
            <input
              autoComplete="off"
              maxLength={40}
              placeholder={type === 'GRUPOS' ? 'Ej: Fase de grupos' : 'Ej: Cuartos de final'}
              value={name}
              onChange={(e) => setOwnName(e.target.value)}
            />
          </label>
          {type === 'GRUPOS' ? (
            <label className="login__field">
              <span>Clasifican por grupo</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={16}
                value={qualifiers}
                onChange={(e) => setQualifiers(e.target.value)}
              />
            </label>
          ) : (
            <label className="login__field">
              <span>Equipos de la fase</span>
              <select
                value={teams ?? ''}
                onChange={(e) => setTeams(e.target.value === '' ? null : Number(e.target.value))}
              >
                <option value="" disabled>
                  Elige cuántos equipos
                </option>
                {FINAL_ROUNDS.map((round) => (
                  <option key={round.teams} value={round.teams}>
                    {round.teams} equipos ({round.name.toLowerCase()})
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {trimmedName !== '' && trimmedName.length < 3 && (
          <p className="field-hint">El nombre debe tener al menos 3 caracteres.</p>
        )}
        {type === 'GRUPOS' && !qualifiersValid && (
          <p className="field-hint">Los clasificados por grupo deben ser un número entero entre 1 y 16.</p>
        )}
        <p className="form-dialog__note">
          {type === 'GRUPOS'
            ? 'Los grupos y sus equipos se arman después, en la fase.'
            : 'Cada llave es un partido entre dos equipos: con 8 equipos hay 4 llaves.'}
          {isNew && ' La fase nueva queda de última; el orden se cambia con las flechas de la lista.'}
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
          <button type="submit" className="button button--primary" disabled={loading || !canSubmit}>
            {loading ? 'Guardando…' : 'Guardar fase'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
