import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { User } from '../../api/auth'
import { errorMessage } from '../../api/client'
import { createUser, updateUser } from '../../api/users'
import { PasswordRuleList } from '../auth/PasswordRuleList'
import { isStrongPassword } from '../auth/passwordRules'
import '../auth/LoginPage.css'

interface UserFormDialogProps {
  user: User | null // null: crear uno nuevo; con usuario: editarlo
  onClose: () => void
  onSaved: (user: User) => void
}

// Ventana para crear o editar un usuario. Usa <dialog>, que ya bloquea el fondo y se cierra con Escape.
export function UserFormDialog({ user, onClose, onSaved }: UserFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isNew = user === null
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  // Al crear, la contraseña es obligatoria. Al editar, vacía significa "no cambiarla".
  const passwordOk = password === '' ? !isNew : isStrongPassword(password)
  const canSubmit = name.trim().length >= 2 && email.trim() !== '' && passwordOk

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    const input = { name: name.trim(), email: email.trim(), ...(password ? { password } : {}) }
    try {
      onSaved(isNew ? await createUser(input) : await updateUser(user.id, input))
    } catch (err) {
      setError(errorMessage(err)) // ej: "Ya existe un usuario con ese email"
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="form-dialog" onClose={onClose} aria-labelledby="form-dialog-title">
      <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
        <h2 id="form-dialog-title" className="panel__title">
          {isNew ? 'Nuevo usuario' : 'Editar usuario'}
        </h2>

        <label className="login__field">
          <span>Nombre</span>
          <input autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="login__field">
          <span>Correo electrónico</span>
          <input type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label className="login__field">
          <span>{isNew ? 'Contraseña' : 'Nueva contraseña (opcional)'}</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {isNew || password !== '' ? (
          <PasswordRuleList password={password} />
        ) : (
          <p className="login__hint">Déjala vacía para conservar la contraseña actual.</p>
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
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
