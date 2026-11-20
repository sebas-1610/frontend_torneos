import { Grid2x2, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '../../api/client'
import { createGroup, updateGroup, type Group } from '../../api/groups'
import type { Phase } from '../../api/phases'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'

interface GroupFormDialogProps {
  phase: Phase
  group: Group | null // null: crear uno nuevo
  suggestedName: string // la primera letra libre: "Grupo C"
  onClose: () => void
  onSaved: (group: Group, isNew: boolean) => void
}

// Formulario de un grupo (HU-GC-04): solo el nombre. Los equipos se asignan desde su tarjeta.
export function GroupFormDialog({ phase, group, suggestedName, onClose, onSaved }: GroupFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isNew = group === null
  const [name, setName] = useState(group?.name ?? suggestedName)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const trimmedName = name.trim()
  const canSubmit = trimmedName.length >= 1 && trimmedName.length <= 30

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return
    setError(null)
    setLoading(true)
    try {
      onSaved(isNew ? await createGroup(phase.id, trimmedName) : await updateGroup(group.id, trimmedName), isNew)
    } catch (err) {
      setError(errorMessage(err)) // ej: 409 "La fase ya tiene un grupo llamado…"
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="form-dialog" onClose={onClose} aria-labelledby="group-form-title">
      <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
        <div className="form-dialog__head">
          <span className="panel-head__icon" aria-hidden="true">
            <Grid2x2 size={16} />
          </span>
          <h2 id="group-form-title" className="panel__title">
            {isNew ? `Nuevo grupo en ${phase.name}` : 'Editar grupo'}
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
          <span>Nombre del grupo</span>
          <input
            autoComplete="off"
            maxLength={30}
            placeholder="Ej: Grupo A"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <p className="form-dialog__note">No se puede repetir dentro de la fase.</p>

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
            {loading ? 'Guardando…' : 'Guardar grupo'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
