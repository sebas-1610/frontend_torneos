import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '../../api/client'
import { createSport, updateSport, type Sport } from '../../api/sports'
import { selfAndDescendants, sportPath, treeOrder } from './sportTree'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'

interface SportFormDialogProps {
  sport: Sport | null // null: crear uno nuevo
  initialParentId: number | null // "Agregar subdeporte": el padre ya viene elegido
  sports: Sport[] // para elegir el deporte padre
  onClose: () => void
  onSaved: (sport: Sport, isNew: boolean) => void
}

export function SportFormDialog({ sport, initialParentId, sports, onClose, onSaved }: SportFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isNew = sport === null
  const [name, setName] = useState(sport?.name ?? '')
  const [description, setDescription] = useState(sport?.description ?? '')
  const [parentId, setParentId] = useState<number | null>(sport ? (sport.parent?.id ?? null) : initialParentId)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  // Posibles padres: los activos (el backend no acepta uno desactivado) y el que ya tiene, aunque esté
  // desactivado. Nunca él mismo ni sus subdeportes: sería un ciclo.
  const parentOptions = useMemo(() => {
    const blocked = sport ? selfAndDescendants(sports, sport.id) : new Set<number>()
    const currentParentId = sport?.parent?.id ?? null
    return treeOrder(sports)
      .map((row) => row.sport)
      .filter((option) => !blocked.has(option.id) && (option.active || option.id === currentParentId))
      .map((option) => ({
        id: option.id,
        label: sportPath(sports, option) + (option.active ? '' : ' (desactivado)'),
      }))
  }, [sports, sport])

  // Mismas reglas que valida el backend (CreateSportDto).
  const trimmedName = name.trim()
  const canSubmit = trimmedName !== '' && trimmedName.length <= 60 && description.length <= 255

  const title = !isNew ? 'Editar deporte' : initialParentId !== null ? 'Nuevo subdeporte' : 'Nuevo deporte'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    const input = { name: trimmedName, description: description.trim() || null, parentId }
    try {
      onSaved(isNew ? await createSport(input) : await updateSport(sport.id, input), isNew)
    } catch (err) {
      setError(errorMessage(err)) // ej: 409 "Ya existe un deporte llamado..." o 400 por un ciclo
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="form-dialog" onClose={onClose} aria-labelledby="sport-form-title">
      <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
        <h2 id="sport-form-title" className="panel__title">
          {title}
        </h2>

        <label className="login__field">
          <span>Nombre</span>
          <input autoComplete="off" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="login__field">
          <span>Deporte padre</span>
          <select
            value={parentId ?? ''}
            onChange={(e) => setParentId(e.target.value === '' ? null : Number(e.target.value))}
          >
            <option value="">Ninguno: es un deporte principal</option>
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

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
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
