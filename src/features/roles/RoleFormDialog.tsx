import { useEffect, useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '../../api/client'
import { createRole, updateRole } from '../../api/roles'
import type { Role } from '../../api/security'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'

interface RoleFormDialogProps {
  role: Role | null // null: crear uno nuevo
  onClose: () => void
  onSaved: (role: Role) => void
}

export function RoleFormDialog({ role, onClose, onSaved }: RoleFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isNew = role === null
  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  // Mismas reglas que valida el backend (BaseRoleDTO).
  const nameLength = name.trim().length
  const canSubmit = nameLength >= 3 && nameLength <= 50 && description.trim() !== '' && description.length <= 255

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    const input = { name: name.trim(), description: description.trim() }
    try {
      onSaved(isNew ? await createRole(input) : await updateRole(role.id, input))
    } catch (err) {
      setError(errorMessage(err)) // ej: "Ya existe un rol con ese nombre"
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="form-dialog" onClose={onClose} aria-labelledby="form-dialog-title">
      <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
        <h2 id="form-dialog-title" className="panel__title">
          {isNew ? 'Nuevo rol' : 'Editar rol'}
        </h2>

        <label className="login__field">
          <span>Nombre</span>
          <input autoComplete="off" maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        {/* El backend busca "Administrador" por nombre al arrancar: si se renombra, crea otro. */}
        {role?.name === 'Administrador' && name.trim() !== 'Administrador' && (
          <p className="login__hint">
            Si cambias el nombre de este rol, al reiniciar el backend se creará otro «Administrador».
          </p>
        )}

        <label className="login__field">
          <span>Descripción</span>
          <textarea
            rows={3}
            maxLength={255}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
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
