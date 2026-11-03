import { ShieldPlus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { User } from '../../api/auth'
import { errorMessage } from '../../api/client'
import { assignRole, findUserRoles, removeRole, type UserRoleAssignment } from '../../api/roles'
import { findRoles, type Role } from '../../api/security'
import { RESOURCES, useAccess } from '../../auth/access'
import { SubjectBreak, SubjectRole, SubjectUser } from '../../components/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'
import { roleHue } from '../roles/labels'
import { RoleMonogram } from '../roles/RoleSelect'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'

interface UserRolesDialogProps {
  user: User
  onClose: () => void
}

// Ventana "Roles" desde el listado de usuarios (HU-SE-01 y HU-SE-04): qué roles tiene el usuario,
// asignarle otro y retirarle uno (con confirmación). Sus permisos son la suma de los de estos roles.
export function UserRolesDialog({ user, onClose }: UserRolesDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { can, userId } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const [roles, setRoles] = useState<Role[]>([])
  const [assigned, setAssigned] = useState<UserRoleAssignment[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canAssign = can(RESOURCES.userRoles, 'CREATE')
  const canRemove = can(RESOURCES.userRoles, 'DELETE')
  const isOwn = user.id === userId

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([findRoles(), findUserRoles(user.id)])
      .then(([allRoles, userRoles]) => {
        if (!active) return
        setRoles(allRoles)
        setAssigned(userRoles)
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
  }, [user.id])

  // Un rol no se asigna dos veces al mismo usuario (HU-SE-04): solo se ofrecen los que le faltan.
  const available = roles.filter((role) => !assigned.some((item) => item.role.id === role.id))

  async function handleAssign() {
    setBusy(true)
    setError(null)
    try {
      const created = await assignRole(user.id, Number(selectedRoleId))
      setAssigned((list) => [...list, created])
      setSelectedRoleId('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(role: Role) {
    const confirmed = await confirm({
      title: `¿Quitar el rol ${role.name} a ${user.name}?`,
      message: (
        <>
          <p>Deja de tener de inmediato los permisos que le da este rol. El usuario y el rol siguen existiendo.</p>
          {isOwn && (
            <p>
              <strong>Es tu propia cuenta:</strong> perderás esos permisos en tu próxima acción.
            </p>
          )}
        </>
      ),
      confirmLabel: 'Quitar rol',
      subject: (
        <>
          <SubjectUser name={user.name} email={user.email} />
          <SubjectBreak />
          <SubjectRole name={role.name} hue={roleHue(roles, role.id)} />
        </>
      ),
    })
    if (!confirmed) return
    setBusy(true)
    setError(null)
    try {
      await removeRole(user.id, role.id)
      setAssigned((list) => list.filter((item) => item.role.id !== role.id))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <dialog ref={dialogRef} className="form-dialog" onClose={onClose} aria-labelledby="user-roles-title">
        <div className="form-dialog__form">
          <div className="dialog-identity__text">
            <h2 id="user-roles-title" className="panel__title">
              Roles de {user.name}
            </h2>
            <p className="dialog-identity__detail">
              {user.email} · sus permisos son la suma de los permisos de estos roles.
            </p>
          </div>

          {canAssign &&
            (user.enabled ? (
              <div className="members__add">
                <select
                  aria-label="Rol para asignar"
                  value={selectedRoleId}
                  disabled={loading || busy || available.length === 0}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                >
                  <option value="">{available.length === 0 ? 'Ya tiene todos los roles' : 'Elige un rol…'}</option>
                  {available.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="button button--primary"
                  disabled={busy || selectedRoleId === ''}
                  onClick={handleAssign}
                >
                  <ShieldPlus size={16} aria-hidden="true" />
                  Asignar
                </button>
              </div>
            ) : (
              // Regla del backend: a un usuario desactivado no se le asignan roles.
              <p className="dialog-note">El usuario está desactivado: actívalo para poder asignarle roles.</p>
            ))}

          {error && (
            <p className="login__error" role="alert">
              {error}
            </p>
          )}

          {loading ? (
            <p className="empty-state">Cargando roles…</p>
          ) : assigned.length === 0 ? (
            <p className="empty-state">Todavía no tiene roles: no puede usar ninguna opción protegida.</p>
          ) : (
            <ul className="members__list">
              {assigned.map(({ role }) => (
                <li key={role.id}>
                  <div className="role-cell">
                    <RoleMonogram name={role.name} hue={roleHue(roles, role.id)} size="sm" />
                    <div>
                      <p className="data-table__strong">{role.name}</p>
                      <p className="members__email">{role.description}</p>
                    </div>
                  </div>
                  {canRemove && (
                    <button
                      type="button"
                      className="icon-button icon-button--small"
                      aria-label={`Quitar el rol ${role.name}`}
                      title="Quitar rol"
                      disabled={busy}
                      onClick={() => handleRemove(role)}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  )}
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
      {confirmDialog}
    </>
  )
}
