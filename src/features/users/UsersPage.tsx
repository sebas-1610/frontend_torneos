import { Pencil, Search, Trash2, UserPlus, UserRoundCheck, UserRoundX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { User } from '../../api/auth'
import { errorMessage } from '../../api/client'
import { deleteUser, disableUser, enableUser, findUsers } from '../../api/users'
import { UserFormDialog } from './UserFormDialog'
import '../../components/ListPage.css'

const PROVIDER_LABELS: Record<User['authProvider'], string> = {
  LOCAL: 'Correo',
  GOOGLE: 'Google',
  GITHUB: 'GitHub',
  MICROSOFT: 'Microsoft',
}

// Pantalla "Usuarios": lista, búsqueda, crear, editar, activar/desactivar y eliminar.
export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  // Ventana abierta: null = cerrada, 'new' = crear, un usuario = editarlo.
  const [editing, setEditing] = useState<User | 'new' | null>(null)
  // Usuario con una acción en curso (para desactivar sus botones mientras responde el backend).
  const [busyId, setBusyId] = useState<number | null>(null)

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

  function toggleEnabled(user: User) {
    if (user.enabled && !window.confirm(`¿Desactivar a ${user.name}? Se cerrarán todas sus sesiones.`)) return
    void runAction(user, async () => upsert(await (user.enabled ? disableUser(user.id) : enableUser(user.id))))
  }

  function remove(user: User) {
    if (!window.confirm(`¿Eliminar a ${user.name}? También se borran su perfil, sus roles y sus sesiones.`)) return
    void runAction(user, async () => {
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
        <button type="button" className="button button--primary" onClick={() => setEditing('new')}>
          <UserPlus size={18} aria-hidden="true" />
          Nuevo usuario
        </button>
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
                          title={user.enabled ? 'Desactivar' : 'Activar'}
                          aria-label={`${user.enabled ? 'Desactivar' : 'Activar'} a ${user.name}`}
                          disabled={busy}
                          onClick={() => toggleEnabled(user)}
                        >
                          {user.enabled ? (
                            <UserRoundX size={16} aria-hidden="true" />
                          ) : (
                            <UserRoundCheck size={16} aria-hidden="true" />
                          )}
                        </button>
                        <button
                          type="button"
                          className="icon-button icon-button--small row-actions__delete"
                          title="Eliminar"
                          aria-label={`Eliminar a ${user.name}`}
                          disabled={busy}
                          onClick={() => remove(user)}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
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
    </div>
  )
}
