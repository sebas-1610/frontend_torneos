import { ShieldPlus, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '../../api/client'
import { createTeam, updateTeam, type Team } from '../../api/teams'
import { ImageField } from '../../components/ImageField'
import { TeamMonogram } from '../../components/TeamMonogram'
import { today } from '../../utils/dates'
import { shieldFromFile } from '../../utils/image'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'

interface TeamFormDialogProps {
  team: Team | null // null: crear uno nuevo
  onClose: () => void
  onSaved: (team: Team, isNew: boolean) => void
}

// Formulario de equipo (HU-GD-02). El estado no va aquí: se cambia con Activar / Desactivar.
export function TeamFormDialog({ team, onClose, onSaved }: TeamFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isNew = team === null
  const [name, setName] = useState(team?.name ?? '')
  const [shortName, setShortName] = useState(team?.shortName ?? '')
  const [city, setCity] = useState(team?.city ?? '')
  const [foundationDate, setFoundationDate] = useState(team?.foundationDate ?? '')
  const [description, setDescription] = useState(team?.description ?? '')
  const [shield, setShield] = useState(team?.shield ?? null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  // Mismas reglas que valida el backend (CreateTeamDto).
  const trimmedName = name.trim()
  const trimmedCity = city.trim()
  const canSubmit =
    trimmedName !== '' &&
    trimmedName.length <= 60 &&
    shortName.trim().length <= 30 &&
    trimmedCity !== '' &&
    trimmedCity.length <= 60 &&
    description.length <= 255 &&
    (foundationDate === '' || foundationDate <= today())

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    const input = {
      name: trimmedName,
      shortName: shortName.trim() || null,
      city: trimmedCity,
      foundationDate: foundationDate || null,
      description: description.trim() || null,
      shield,
    }
    try {
      onSaved(isNew ? await createTeam(input) : await updateTeam(team.id, input), isNew)
    } catch (err) {
      setError(errorMessage(err)) // ej: 409 "Ya existe un equipo llamado..."
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="form-dialog form-dialog--wide"
      onClose={onClose}
      aria-labelledby="team-form-title"
    >
      <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
        <div className="form-dialog__head">
          <span className="panel-head__icon" aria-hidden="true">
            <ShieldPlus size={16} />
          </span>
          <h2 id="team-form-title" className="panel__title">
            {isNew ? 'Nuevo equipo' : 'Editar equipo'}
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

        <ImageField
          label="Escudo (opcional)"
          hint="JPG, PNG o WEBP. Se ve entero, sin recortar; mejor con fondo transparente."
          preview={<TeamMonogram team={{ id: team?.id ?? 0, name, shield }} size="lg" />}
          value={shield}
          read={shieldFromFile}
          uploadLabel="Subir escudo"
          changeLabel="Cambiar escudo"
          inputLabel="Elegir escudo del equipo"
          onChange={setShield}
        />

        <div className="form-dialog__row">
          <label className="login__field">
            <span>Nombre del equipo</span>
            <input autoComplete="off" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="login__field">
            <span>Nombre corto (opcional)</span>
            <input
              autoComplete="off"
              maxLength={30}
              placeholder="Ej: AT. Manizales"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
            />
          </label>
        </div>

        <div className="form-dialog__row">
          <label className="login__field">
            <span>Ciudad</span>
            <input autoComplete="off" maxLength={60} value={city} onChange={(e) => setCity(e.target.value)} />
          </label>
          <label className="login__field">
            <span>Fecha de fundación (opcional)</span>
            <input
              type="date"
              max={today()}
              value={foundationDate}
              onChange={(e) => setFoundationDate(e.target.value)}
            />
          </label>
        </div>

        <label className="login__field">
          <span>Descripción (opcional)</span>
          <textarea rows={3} maxLength={255} value={description} onChange={(e) => setDescription(e.target.value)} />
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
          <button type="submit" className="button button--primary" disabled={loading || !canSubmit}>
            {loading ? 'Guardando…' : 'Guardar equipo'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
