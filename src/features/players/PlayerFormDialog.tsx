import { UserRoundPen, UserRoundPlus, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '../../api/client'
import {
  createPlayer,
  DOCUMENT_TYPES,
  DOMINANT_FEET,
  updatePlayer,
  type DocumentType,
  type DominantFoot,
  type Player,
} from '../../api/players'
import { today } from '../../utils/dates'
import { PhotoField } from './PhotoField'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'

// Sugerencias para la posición. Es texto libre (cambia de un deporte a otro): se puede escribir otra.
const POSITIONS = ['Portero', 'Defensa', 'Lateral', 'Volante', 'Extremo', 'Delantero', 'Base', 'Alero', 'Pívot', 'Líbero']

// Sugerencias para la nacionalidad. También es texto libre.
const NATIONALITIES = [
  'Colombia',
  'Argentina',
  'Bolivia',
  'Brasil',
  'Chile',
  'Costa Rica',
  'Ecuador',
  'España',
  'Estados Unidos',
  'México',
  'Panamá',
  'Paraguay',
  'Perú',
  'Uruguay',
  'Venezuela',
]

const DOCUMENT_NUMBER = /^[A-Za-z0-9]+$/

interface PlayerFormDialogProps {
  player: Player | null // null: crear uno nuevo
  onClose: () => void
  onSaved: (player: Player, isNew: boolean) => void
}

// Formulario de jugador (HU-GD-04). El equipo no va aquí: se asigna con un contrato, que lleva fechas
// de inicio y fin (HU-GD-05). El estado tampoco: se cambia con Activar / Desactivar.
export function PlayerFormDialog({ player, onClose, onSaved }: PlayerFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const positionsId = useId()
  const nationalitiesId = useId()
  const isNew = player === null
  const [firstName, setFirstName] = useState(player?.firstName ?? '')
  const [lastName, setLastName] = useState(player?.lastName ?? '')
  const [documentType, setDocumentType] = useState<DocumentType>(player?.documentType ?? 'CC')
  const [documentNumber, setDocumentNumber] = useState(player?.documentNumber ?? '')
  const [birthDate, setBirthDate] = useState(player?.birthDate ?? '')
  const [position, setPosition] = useState(player?.position ?? '')
  const [nationality, setNationality] = useState(player?.nationality ?? '')
  // La estatura se escribe en metros, como en el mockup ("1.80"); el backend la guarda en centímetros.
  const [height, setHeight] = useState(player?.heightCm ? (player.heightCm / 100).toFixed(2) : '')
  const [dominantFoot, setDominantFoot] = useState<DominantFoot | ''>(player?.dominantFoot ?? '')
  const [photo, setPhoto] = useState(player?.photo ?? null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  // Mismas reglas que valida el backend (CreatePlayerDto).
  const number = documentNumber.trim()
  const numberError =
    number !== '' && !DOCUMENT_NUMBER.test(number) ? 'Documento: solo letras y números, sin puntos ni espacios.' : null
  // "1,80" también vale. Lo que no sea un número queda como NaN y no pasa la validación.
  const heightCm = height.trim() === '' ? null : Math.round(Number(height.trim().replace(',', '.')) * 100)
  const heightError =
    heightCm !== null && !(heightCm >= 100 && heightCm <= 250)
      ? 'Estatura: escríbela en metros, entre 1.00 y 2.50 (ej: 1.80).'
      : null
  const canSubmit =
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    number !== '' &&
    numberError === null &&
    heightError === null &&
    birthDate !== '' &&
    birthDate <= today()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    const input = {
      documentType,
      documentNumber: number,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDate,
      position: position.trim() || null,
      nationality: nationality.trim() || null,
      heightCm,
      dominantFoot: dominantFoot || null,
      photo,
    }
    try {
      onSaved(isNew ? await createPlayer(input) : await updatePlayer(player.id, input), isNew)
    } catch (err) {
      setError(errorMessage(err)) // ej: 409 "Ya existe un jugador con el documento..."
    } finally {
      setLoading(false)
    }
  }

  const HeadIcon = isNew ? UserRoundPlus : UserRoundPen
  return (
    <dialog
      ref={dialogRef}
      className="form-dialog form-dialog--wide"
      onClose={onClose}
      aria-labelledby="player-form-title"
    >
      <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
        <div className="form-dialog__head">
          <span className="panel-head__icon" aria-hidden="true">
            <HeadIcon size={16} />
          </span>
          <h2 id="player-form-title" className="panel__title">
            {isNew ? 'Nuevo jugador' : 'Editar jugador'}
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

        <PhotoField player={{ id: player?.id ?? 0, firstName, lastName, photo }} onChange={setPhoto} />

        <div className="form-dialog__row">
          <label className="login__field">
            <span>Nombres</span>
            <input autoComplete="off" maxLength={60} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </label>
          <label className="login__field">
            <span>Apellidos</span>
            <input autoComplete="off" maxLength={60} value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </label>
        </div>

        <div className="form-dialog__row">
          <label className="login__field">
            <span>Tipo de documento</span>
            <select value={documentType} onChange={(e) => setDocumentType(e.target.value as DocumentType)}>
              {DOCUMENT_TYPES.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.key} · {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="login__field">
            <span>Número de documento</span>
            <input
              autoComplete="off"
              inputMode="numeric"
              maxLength={20}
              aria-invalid={numberError !== null}
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
            />
          </label>
        </div>

        <div className="form-dialog__row">
          <label className="login__field">
            <span>Fecha de nacimiento</span>
            <input type="date" max={today()} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </label>
          <label className="login__field">
            <span>Nacionalidad (opcional)</span>
            <input
              autoComplete="off"
              maxLength={60}
              list={nationalitiesId}
              placeholder="Ej: Colombia"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
            />
            <datalist id={nationalitiesId}>
              {NATIONALITIES.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </label>
        </div>

        <div className="form-dialog__row">
          <label className="login__field">
            <span>Posición (opcional)</span>
            <input
              autoComplete="off"
              maxLength={30}
              list={positionsId}
              placeholder="Ej: Delantero"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
            <datalist id={positionsId}>
              {POSITIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </label>
          <label className="login__field">
            <span>Pie dominante (opcional)</span>
            <select value={dominantFoot} onChange={(e) => setDominantFoot(e.target.value as DominantFoot | '')}>
              <option value="">Sin definir</option>
              {DOMINANT_FEET.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-dialog__row">
          <label className="login__field">
            <span>Estatura en metros (opcional)</span>
            <input
              autoComplete="off"
              inputMode="decimal"
              maxLength={4}
              placeholder="Ej: 1.80"
              aria-invalid={heightError !== null}
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </label>
        </div>

        {(numberError ?? heightError ?? error) && (
          <p className="login__error" role="alert">
            {numberError ?? heightError ?? error}
          </p>
        )}

        <div className="form-dialog__actions">
          <button type="button" className="button button--outline" onClick={() => dialogRef.current?.close()}>
            Cancelar
          </button>
          <button type="submit" className="button button--primary" disabled={loading || !canSubmit}>
            {loading ? 'Guardando…' : 'Guardar jugador'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
