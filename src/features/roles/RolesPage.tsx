import { KeyRound, Pencil, ShieldPlus, Trash2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { errorMessage } from '../../api/client'
import { deleteRole } from '../../api/roles'
import { findRoles, type Role } from '../../api/security'
import { roleHue } from './labels'
import { RoleFormDialog } from './RoleFormDialog'
import { RoleMembersDialog } from './RoleMembersDialog'
import { RoleMonogram } from './RoleSelect'
import '../../components/ListPage.css'

// Pantalla "Roles": lista de roles para crear, editar, eliminar y manejar sus usuarios.
// La matriz de permisos de cada rol está en "Asignar permisos" (#roles-permisos).
export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Ventanas abiertas: formulario ('new' o un rol) y usuarios de un rol.
  const [editing, setEditing] = useState<Role | 'new' | null>(null)
  const [membersOf, setMembersOf] = useState<Role | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

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
    if (!window.confirm(`¿Eliminar el rol ${role.name}? No se puede si tiene usuarios asignados.`)) return
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
          <a className="button button--outline" href="#roles-permisos">
            <KeyRound size={18} aria-hidden="true" />
            Asignar permisos
          </a>
          <button type="button" className="button button--primary" onClick={() => setEditing('new')}>
            <ShieldPlus size={18} aria-hidden="true" />
            Nuevo rol
          </button>
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
      {membersOf && <RoleMembersDialog role={membersOf} onClose={() => setMembersOf(null)} />}
    </div>
  )
}
