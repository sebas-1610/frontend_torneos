import { KeyRound, Pencil, ShieldPlus, Trash2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { errorMessage } from '../../api/client'
import { deleteRole } from '../../api/roles'
import { findRoles, type Role } from '../../api/security'
import { RESOURCES, useAccess } from '../../auth/access'
import { SubjectRole } from '../../components/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'
import { roleHue } from './labels'
import { RoleFormDialog } from './RoleFormDialog'
import { RoleMembersDialog } from './RoleMembersDialog'
import { RoleMonogram } from './RoleSelect'
import '../../components/ListPage.css'

// Pantalla "Roles": lista de roles para crear, editar, eliminar y manejar sus usuarios.
// Desde cada rol se abren sus usuarios y su matriz de permisos (HU-SE-03).
export function RolesPage() {
  const { can } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Ventanas abiertas: formulario ('new' o un rol) y usuarios de un rol.
  const [editing, setEditing] = useState<Role | 'new' | null>(null)
  const [membersOf, setMembersOf] = useState<Role | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const canCreate = can(RESOURCES.roles, 'CREATE')
  const canUpdate = can(RESOURCES.roles, 'UPDATE')
  const canDelete = can(RESOURCES.roles, 'DELETE')
  const canSeeMembers = can(RESOURCES.userRoles, 'LIST')
  const canSeeMatrix = can(RESOURCES.rolePermissions, 'VIEW')

  useEffect(() => {
    let active = true
    findRoles()
      .then((list) => {
        if (active) setRoles(list)
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
  }, [])

  function upsert(saved: Role) {
    setRoles((list) =>
      list.some((role) => role.id === saved.id)
        ? list.map((role) => (role.id === saved.id ? saved : role))
        : [...list, saved],
    )
  }

  async function remove(role: Role) {
    const confirmed = await confirm({
      title: `¿Eliminar el rol ${role.name}?`,
      message:
        'Se borran sus permisos asignados; los usuarios y los permisos del sistema siguen existiendo. ' +
        'Si el rol tiene usuarios, no se puede eliminar: primero quítaselos.',
      confirmLabel: 'Eliminar rol',
      subject: <SubjectRole name={role.name} hue={roleHue(roles, role.id)} />,
    })
    if (!confirmed) return
    setBusyId(role.id)
    setError(null)
    try {
      await deleteRole(role.id)
      setRoles((list) => list.filter((item) => item.id !== role.id))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page">
      <div className="page__head list-head">
        <div>
          <h1 className="page__title">Roles</h1>
          <p className="page__finding">{loading ? 'Cargando roles…' : `${roles.length} roles registrados.`}</p>
        </div>
        <div className="list-head__actions">
          {canSeeMatrix && (
            <a className="button button--outline" href="#roles-permisos">
              <KeyRound size={18} aria-hidden="true" />
              Asignar permisos
            </a>
          )}
          {canCreate && (
            <button type="button" className="button button--primary" onClick={() => setEditing('new')}>
              <ShieldPlus size={18} aria-hidden="true" />
              Nuevo rol
            </button>
          )}
        </div>
      </div>

      <section className="panel" aria-label="Lista de roles">
        {error && (
          <p className="login__error list-error" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="empty-state">Cargando roles…</p>
        ) : roles.length === 0 ? (
          <p className="empty-state">No hay roles para mostrar.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rol</th>
                  <th>Descripción</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => {
                  const busy = busyId === role.id
                  return (
                    <tr key={role.id}>
                      <td>
                        <span className="role-cell">
                          <RoleMonogram name={role.name} hue={roleHue(roles, role.id)} size="sm" />
                          <span className="data-table__strong">{role.name}</span>
                        </span>
                      </td>
                      <td className="data-table__wrap">{role.description}</td>
                      <td>
                        <div className="row-actions">
                          {canSeeMembers && (
                            <button
                              type="button"
                              className="icon-button icon-button--small"
                              title="Usuarios del rol"
                              aria-label={`Usuarios del rol ${role.name}`}
                              disabled={busy}
                              onClick={() => setMembersOf(role)}
                            >
                              <Users size={16} aria-hidden="true" />
                            </button>
                          )}
                          {/* Abre la matriz con este rol ya elegido (#roles-permisos/{id}). */}
                          {canSeeMatrix && (
                            <a
                              className="icon-button icon-button--small"
                              href={`#roles-permisos/${role.id}`}
                              title="Permisos del rol"
                              aria-label={`Permisos del rol ${role.name}`}
                            >
                              <KeyRound size={16} aria-hidden="true" />
                            </a>
                          )}
                          {canUpdate && (
                            <button
                              type="button"
                              className="icon-button icon-button--small"
                              title="Editar"
                              aria-label={`Editar el rol ${role.name}`}
                              disabled={busy}
                              onClick={() => setEditing(role)}
                            >
                              <Pencil size={16} aria-hidden="true" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              className="icon-button icon-button--small row-actions__delete"
                              title="Eliminar"
                              aria-label={`Eliminar el rol ${role.name}`}
                              disabled={busy}
                              onClick={() => remove(role)}
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <RoleFormDialog
          role={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            upsert(saved)
            setEditing(null)
          }}
        />
      )}
      {membersOf && (
        <RoleMembersDialog role={membersOf} hue={roleHue(roles, membersOf.id)} onClose={() => setMembersOf(null)} />
      )}
      {confirmDialog}
    </div>
  )
}
