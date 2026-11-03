import { UserPlus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { User } from '../../api/auth'
import { errorMessage } from '../../api/client'
import { assignRole, findAvailableUsers, findRoleMembers, removeRole, type RoleMember } from '../../api/roles'
import type { Role } from '../../api/security'
import { RESOURCES, isAdminRole, useAccess } from '../../auth/access'
import { SubjectBreak, SubjectRole, SubjectUser } from '../../components/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'

interface RoleMembersDialogProps {
  role: Role
  hue: number // tono del monograma del rol, el mismo de la lista de roles
  onClose: () => void
}

// Ventana para ver, agregar y quitar los usuarios de un rol (HU-SE-04).
export function RoleMembersDialog({ role, hue, onClose }: RoleMembersDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { can, userId } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const [members, setMembers] = useState<RoleMember[]>([])
  const [available, setAvailable] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Cada cambio vuelve a pedir las dos listas.
  const [reloadKey, setReloadKey] = useState(0)

  const canAssign = can(RESOURCES.userRoles, 'CREATE')
  const canRemove = can(RESOURCES.userRoles, 'DELETE')

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([findRoleMembers(role.id), findAvailableUsers(role.id)])
      .then(([nextMembers, nextAvailable]) => {
        if (!active) return
        setMembers(nextMembers)
        setAvailable(nextAvailable)
        setSelectedUserId('')
      })
      .catch((err) => {
        if (active) setError(errorMessage(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [role.id, reloadKey])

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      setReloadKey((key) => key + 1)
    } catch (err) {
      setError(errorMessage(err)) // ej: "No se puede asignar un rol a un usuario desactivado"
    } finally {
      setBusy(false)
    }
  }

  // HU-SE-04: retirar un rol pide confirmación. Solo se borra la asignación.
  async function handleRemove(user: User) {
    const confirmed = await confirm({
      title: `¿Quitar a ${user.name} del rol ${role.name}?`,
      message: (
        <>
          <p>Deja de tener de inmediato los permisos que le da este rol. El usuario y el rol siguen existiendo.</p>
          {user.id === userId && (
            <p>
              <strong>Es tu propia cuenta:</strong> perderás esos permisos en tu próxima acción.
            </p>
          )}
        </>
      ),
      confirmLabel: 'Quitar del rol',
      subject: (
        <>
          <SubjectUser name={user.name} email={user.email} />
          <SubjectBreak />
          <SubjectRole name={role.name} hue={hue} />
        </>
      ),
    })
    if (confirmed) await run(() => removeRole(user.id, role.id))
  }

  return (
    <>
      <dialog ref={dialogRef} className="form-dialog" onClose={onClose} aria-labelledby="members-title">
        <div className="form-dialog__form">
          <h2 id="members-title" className="panel__title">
            Usuarios del rol {role.name}
          </h2>

          {canAssign && (
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
          )}

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
              {members.map(({ user }) => {
                // El backend no deja que alguien se quite a sí mismo el rol Administrador (AdminGuard).
                const locked = user.id === userId && isAdminRole(role.name)
                return (
                  <li key={user.id}>
                    <div>
                      <p className="data-table__strong">{user.name}</p>
                      <p className="members__email">{user.email}</p>
                    </div>
                    {canRemove && (
                      <button
                        type="button"
                        className="icon-button icon-button--small"
                        aria-label={`Quitar a ${user.name} del rol`}
                        title={locked ? 'No puedes quitarte a ti mismo el rol Administrador' : 'Quitar del rol'}
                        disabled={busy || locked}
                        onClick={() => handleRemove(user)}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          <div className="form-dialog__actions">
            <button type="button" className="button button--outline" onClick={() => dialogRef.current?.close()}>
              Cerrar
            </button>
          </div>
        </div>
      </dialog>
      {confirmDialog}
    </>
  )
}
