import { Trophy, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '../../api/client'
import type { Sport } from '../../api/sports'
import {
  createTournament,
  updateTournament,
  type Tournament,
  type TournamentCategory,
} from '../../api/tournaments'
import { sportPath, treeOrder } from '../sports/sportTree'
import { CATEGORIES } from './tournamentInfo'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'

interface TournamentFormDialogProps {
  tournament: Tournament | null // null: crear uno nuevo
  sports: Sport[] // para elegir el deporte
  onClose: () => void
  onSaved: (tournament: Tournament, isNew: boolean) => void
}

// Formulario de torneo (HU-GC-01). El estado (por iniciar, en curso, finalizado) no se escribe: sale de
// las fechas. Activo o inactivo se cambia con Activar / Desactivar.
export function TournamentFormDialog({ tournament, sports, onClose, onSaved }: TournamentFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isNew = tournament === null
  const [name, setName] = useState(tournament?.name ?? '')
  const [sportId, setSportId] = useState<number | null>(tournament?.sport.id ?? null)
  const [category, setCategory] = useState<TournamentCategory | ''>(tournament?.category ?? '')
  const [startDate, setStartDate] = useState(tournament?.startDate ?? '')
  const [endDate, setEndDate] = useState(tournament?.endDate ?? '')
  const [deadline, setDeadline] = useState(tournament?.registrationDeadline ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  // Con equipos inscritos el deporte queda fijo: el backend no deja cambiarlo (los equipos son de ese deporte).
  const sportLocked = !isNew && tournament.teamsCount > 0

  // Deportes activos en el orden de la pantalla Deportes; al editar, también el suyo aunque esté desactivado.
  const sportOptions = useMemo(() => {
    const currentId = tournament?.sport.id ?? null
    return treeOrder(sports)
      .map((row) => row.sport)
      .filter((sport) => sport.active || sport.id === currentId)
      .map((sport) => ({ id: sport.id, label: sportPath(sports, sport) + (sport.active ? '' : ' (desactivado)') }))
  }, [sports, tournament])
  // Si la lista de deportes no trae el suyo, se muestra igual con el nombre que llegó en el torneo.
  const missingCurrent =
    tournament !== null && !sportOptions.some((option) => option.id === tournament.sport.id) ? tournament.sport : null

  // Mismas reglas que valida el backend (CreateTournamentDto).
  const trimmedName = name.trim()
  const endBeforeStart = startDate !== '' && endDate !== '' && endDate < startDate
  const deadlineTooLate = startDate !== '' && deadline !== '' && deadline >= startDate
  const canSubmit =
    trimmedName.length >= 3 &&
    trimmedName.length <= 80 &&
    sportId !== null &&
    category !== '' &&
    startDate !== '' &&
    endDate !== '' &&
    !endBeforeStart &&
    !deadlineTooLate

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sportId === null || category === '') return
    setError(null)
    setLoading(true)
    const input = {
      name: trimmedName,
      sportId,
      category,
      startDate,
      endDate,
      registrationDeadline: deadline || null,
    }
    try {
      onSaved(isNew ? await createTournament(input) : await updateTournament(tournament.id, input), isNew)
    } catch (err) {
      setError(errorMessage(err)) // ej: 409 "Ya existe un torneo llamado..."
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="form-dialog form-dialog--wide"
      onClose={onClose}
      aria-labelledby="tournament-form-title"
    >
      <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
        <div className="form-dialog__head">
          <span className="panel-head__icon" aria-hidden="true">
            <Trophy size={16} />
          </span>
          <h2 id="tournament-form-title" className="panel__title">
            {isNew ? 'Nuevo torneo' : 'Editar torneo'}
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

        <label className="login__field">
          <span>Nombre del torneo</span>
          <input
            autoComplete="off"
            maxLength={80}
            placeholder="Ej: Copa Manizales 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        {trimmedName !== '' && trimmedName.length < 3 && (
          <p className="field-hint">El nombre debe tener al menos 3 caracteres.</p>
        )}

        <div className="form-dialog__row">
          <label className="login__field">
            <span>Deporte</span>
            <select
              value={sportId ?? ''}
              disabled={sportLocked}
              onChange={(e) => setSportId(e.target.value === '' ? null : Number(e.target.value))}
            >
              <option value="" disabled>
                Elige un deporte
              </option>
              {missingCurrent && <option value={missingCurrent.id}>{missingCurrent.name}</option>}
              {sportOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="login__field">
            <span>Categoría</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as TournamentCategory)}>
              <option value="" disabled>
                Elige una categoría
              </option>
              {CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {sportLocked && (
          <p className="form-dialog__note">
            Tiene equipos inscritos: para cambiar el deporte, primero retira sus inscripciones.
          </p>
        )}
        {isNew && sportOptions.length === 0 && (
          <p className="field-hint">No hay deportes activos. Créalos o actívalos en la pantalla Deportes.</p>
        )}

        <div className="form-dialog__row">
          <label className="login__field">
            <span>Fecha de inicio</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="login__field">
            <span>Fecha de fin (estimada)</span>
            <input type="date" min={startDate || undefined} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>
        {endBeforeStart && <p className="field-hint">La fecha de fin no puede ser anterior a la de inicio.</p>}

        <label className="login__field">
          <span>Cierre de inscripciones (opcional)</span>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </label>
        {deadlineTooLate ? (
          <p className="field-hint">El cierre de inscripciones debe ser anterior a la fecha de inicio.</p>
        ) : (
          <p className="form-dialog__note">
            Último día para inscribir o retirar equipos. Si lo dejas vacío, las inscripciones cierran cuando empieza
            el torneo.
          </p>
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
          <button type="submit" className="button button--primary" disabled={loading || !canSubmit}>
            {loading ? 'Guardando…' : 'Guardar torneo'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
