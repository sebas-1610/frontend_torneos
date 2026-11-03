import { IdCard, Pencil, Search, ShieldUser, Trash2, UserPlus, UserRoundCheck, UserRoundX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { User } from '../../api/auth'
import { errorMessage } from '../../api/client'
import { deleteUser, disableUser, enableUser, findUsers } from '../../api/users'
import { RESOURCES, useAccess } from '../../auth/access'
import { SubjectUser } from '../../components/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'
import { UserFormDialog } from './UserFormDialog'
import { UserProfileDialog } from './UserProfileDialog'
import { UserRolesDialog } from './UserRolesDialog'
import '../../components/ListPage.css'

const PROVIDER_LABELS: Record<User['authProvider'], string> = {
  LOCAL: 'Correo',
  GOOGLE: 'Google',
  GITHUB: 'GitHub',
  MICROSOFT: 'Microsoft',
}

interface UsersPageProps {
  onOwnPhotoChange: (photo: string | null) => void // al editar el propio perfil desde la lista
}

// Pantalla "Usuarios": lista, búsqueda, crear, editar, activar/desactivar y eliminar.
// Desde cada fila se abre su perfil y sus roles (HU-SE-01).
export function UsersPage({ onOwnPhotoChange }: UsersPageProps) {
  const { can, userId } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  // Ventana abierta: null = cerrada, 'new' = crear, un usuario = editarlo.
  const [editing, setEditing] = useState<User | 'new' | null>(null)
  const [profileOf, setProfileOf] = useState<User | null>(null)
  const [rolesOf, setRolesOf] = useState<User | null>(null)
  // Usuario con una acción en curso (para desactivar sus botones mientras responde el backend).
  const [busyId, setBusyId] = useState<number | null>(null)

  // Cada botón aparece solo si alguno de los roles de la sesión tiene el permiso que pide (HU-SE-08).
  const canCreate = can(RESOURCES.users, 'CREATE')
  const canUpdate = can(RESOURCES.users, 'UPDATE')
  const canDelete = can(RESOURCES.users, 'DELETE')
  const canSeeProfile = can(RESOURCES.profiles, 'VIEW')
  const canSeeRoles = can(RESOURCES.userRoles, 'LIST') && can(RESOURCES.roles, 'LIST')

  useEffect(() => {
    let active = true
    findUsers()
      .then((list) => {
        if (active) setUsers(list)
      })
      .catch((err) => {
        if (active) setError(errorMessage(err)) // ej: 403 si ningún rol tiene users · LIST
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // El backend no filtra ni pagina: la búsqueda se hace aquí.
  const visible = useMemo(() => {
    const text = query.trim().toLowerCase()
    if (!text) return users
    return users.filter((user) => user.name.toLowerCase().includes(text) || user.email.toLowerCase().includes(text))
  }, [users, query])

  const activeCount = users.filter((user) => user.enabled).length

  function upsert(saved: User) {
    setUsers((list) =>
      list.some((user) => user.id === saved.id)
        ? list.map((user) => (user.id === saved.id ? saved : user))
        : [...list, saved],
    )
  }

  async function runAction(user: User, action: () => Promise<void>) {
    setBusyId(user.id)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  async function toggleEnabled(user: User) {
    if (user.enabled) {
      const confirmed = await confirm({
        title: `¿Desactivar a ${user.name}?`,
        message: 'Se cierran todas sus sesiones y no podrá volver a entrar hasta que lo actives. Sus roles se conservan.',
        confirmLabel: 'Desactivar usuario',
        tone: 'neutral',
        subject: <SubjectUser name={user.name} email={user.email} />,
      })
      if (!confirmed) return
    }
    await runAction(user, async () => upsert(await (user.enabled ? disableUser(user.id) : enableUser(user.id))))
  }

  async function remove(user: User) {
    const confirmed = await confirm({
      title: `¿Eliminar a ${user.name}?`,
      message: 'Se borran su perfil, sus asignaciones de roles y sus sesiones. Los roles y permisos del sistema no cambian.',
      confirmLabel: 'Eliminar usuario',
      subject: <SubjectUser name={user.name} email={user.email} />,
    })
    if (!confirmed) return
    await runAction(user, async () => {
      await deleteUser(user.id)
      setUsers((list) => list.filter((item) => item.id !== user.id))
    })
  }

  return (
    <div className="page">
      <div className="page__head list-head">
        <div>
          <h1 className="page__title">Usuarios</h1>
          <p className="page__finding">
            {loading ? 'Cargando usuarios…' : `${users.length} usuarios registrados, ${activeCount} activos.`}
          </p>
        </div>
        {canCreate && (
          <button type="button" className="button button--primary" onClick={() => setEditing('new')}>
            <UserPlus size={18} aria-hidden="true" />
            Nuevo usuario
          </button>
        )}
      </div>

      <section className="panel" aria-label="Lista de usuarios">
        <label className="list-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por nombre o correo"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        {error && (
          <p className="login__error list-error" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="empty-state">Cargando usuarios…</p>
        ) : visible.length === 0 ? (
          <p className="empty-state">
            {users.length === 0 ? 'No hay usuarios para mostrar.' : 'Ningún usuario coincide con la búsqueda.'}
          </p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Acceso</th>
                  <th>Estado</th>
                  <th>2FA</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {visible.map((user) => {
                  const busy = busyId === user.id
                  // El backend no deja que alguien se desactive o se elimine a sí mismo (AdminGuard).
                  const isOwn = user.id === userId
                  return (
                    <tr key={user.id}>
                      <td className="data-table__strong">{user.name}</td>
                      <td>{user.email}</td>
                      <td>{PROVIDER_LABELS[user.authProvider] ?? user.authProvider}</td>
                      <td>
                        <span className={`pill ${user.enabled ? 'pill--positive' : 'pill--neutral'}`}>
                          {user.enabled ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>{user.twoFactorEnabled ? 'Sí' : 'No'}</td>
                      <td className="row-actions">
                        {canSeeProfile && (
                          <button
                            type="button"
                            className="icon-button icon-button--small"
                            title="Perfil"
                            aria-label={`Perfil de ${user.name}`}
                            disabled={busy}
                            onClick={() => setProfileOf(user)}
                          >
                            <IdCard size={16} aria-hidden="true" />
                          </button>
                        )}
                        {canSeeRoles && (
                          <button
                            type="button"
                            className="icon-button icon-button--small"
                            title="Roles"
                            aria-label={`Roles de ${user.name}`}
                            disabled={busy}
                            onClick={() => setRolesOf(user)}
                          >
                            <ShieldUser size={16} aria-hidden="true" />
                          </button>
                        )}
                        {canUpdate && (
                          <>
                            <button
                              type="button"
                              className="icon-button icon-button--small"
                              title="Editar"
                              aria-label={`Editar a ${user.name}`}
                              disabled={busy}
                              onClick={() => setEditing(user)}
                            >
                              <Pencil size={16} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="icon-button icon-button--small"
                              title={
                                isOwn ? 'No puedes desactivar tu propia cuenta' : user.enabled ? 'Desactivar' : 'Activar'
                              }
                              aria-label={`${user.enabled ? 'Desactivar' : 'Activar'} a ${user.name}`}
                              disabled={busy || isOwn}
                              onClick={() => toggleEnabled(user)}
                            >
                              {user.enabled ? (
                                <UserRoundX size={16} aria-hidden="true" />
                              ) : (
                                <UserRoundCheck size={16} aria-hidden="true" />
                              )}
                            </button>
                          </>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="icon-button icon-button--small row-actions__delete"
                            title={isOwn ? 'No puedes eliminar tu propia cuenta' : 'Eliminar'}
                            aria-label={`Eliminar a ${user.name}`}
                            disabled={busy || isOwn}
                            onClick={() => remove(user)}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        )}
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
        <UserFormDialog
          user={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            upsert(saved)
            setEditing(null)
          }}
        />
      )}
      {profileOf && (
        <UserProfileDialog user={profileOf} onClose={() => setProfileOf(null)} onOwnPhotoChange={onOwnPhotoChange} />
      )}
      {rolesOf && <UserRolesDialog user={rolesOf} onClose={() => setRolesOf(null)} />}
      {confirmDialog}
    </div>
  )
}
