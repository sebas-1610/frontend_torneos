import { UserPlus, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { User } from '../../api/auth'
import { errorMessage } from '../../api/client'
import { assignRole, findAvailableUsers, findRoleMembers, removeRole, type RoleMember } from '../../api/roles'
import type { Role } from '../../api/security'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'

interface RoleMembersDialogProps {
  role: Role
  onClose: () => void
}

// Ventana para ver, agregar y quitar los usuarios de un rol.
export function RoleMembersDialog({ role, onClose }: RoleMembersDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [members, setMembers] = useState<RoleMember[]>([])
  const [available, setAvailable] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Se piden las dos listas juntas y se vuelven a pedir después de cada cambio.
  const load = useCallback(async () => {
    const [nextMembers, nextAvailable] = await Promise.all([findRoleMembers(role.id), findAvailableUsers(role.id)])
    setMembers(nextMembers)
    setAvailable(nextAvailable)
    setSelectedUserId('')
  }, [role.id])

  useEffect(() => {
    dialogRef.current?.showModal()
    load()
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [load])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await load()
    } catch (err) {
      setError(errorMessage(err)) // ej: "No se puede asignar un rol a un usuario desactivado"
    } finally {
      setBusy(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="form-dialog" onClose={onClose} aria-labelledby="members-title">
      <div className="form-dialog__form">
        <h2 id="members-title" className="panel__title">
          Usuarios del rol {role.name}
        </h2>

        <div className="members__add">
          <select
            aria-label="Usuario para agregar"
            value={selectedUserId}
            disabled={loading || busy || available.length === 0}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">
              {available.length === 0 ? 'No hay usuarios para agregar' : 'Elige un usuario…'}
            </option>
            {available.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="button button--primary"
            disabled={busy || selectedUserId === ''}
            onClick={() => run(() => assignRole(Number(selectedUserId), role.id))}
          >
            <UserPlus size={16} aria-hidden="true" />
            Agregar
          </button>
        </div>

        {error && (
          <p className="login__error" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="empty-state">Cargando usuarios…</p>
        ) : members.length === 0 ? (
          <p className="empty-state">Este rol todavía no tiene usuarios.</p>
        ) : (
          <ul className="members__list">
            {members.map(({ user }) => (
              <li key={user.id}>
                <div>
                  <p className="data-table__strong">{user.name}</p>
                  <p className="members__email">{user.email}</p>
                </div>
                <button
                  type="button"
                  className="icon-button icon-button--small"
                  aria-label={`Quitar a ${user.name} del rol`}
                  title="Quitar del rol"
                  disabled={busy}
                  onClick={() => run(() => removeRole(user.id, role.id))}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="form-dialog__actions">
          <button type="button" className="button button--outline" onClick={() => dialogRef.current?.close()}>
            Cerrar
          </button>
        </div>
      </div>
    </dialog>
  )
}
