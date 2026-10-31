import { KeyRound, Pencil, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { errorMessage } from '../../api/client'
import { deletePermission, findPermissions, type Permission } from '../../api/permissions'
import type { ModuleType } from '../../api/security'
import { MODULE_LABELS, OPERATIONS, resourceLabel } from '../roles/labels'
import { PermissionFormDialog } from './PermissionFormDialog'
import '../../components/ListPage.css'

const OPERATION_LABELS = Object.fromEntries(OPERATIONS.map(({ key, label }) => [key, label]))
const MODULES = Object.keys(MODULE_LABELS) as ModuleType[]

// Pantalla "Permisos": cada permiso es recurso + operación (ej: usuarios · Listar) y las rutas que habilita.
export function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [moduleFilter, setModuleFilter] = useState<ModuleType | ''>('')
  // Ventana abierta: null = cerrada, 'new' = crear, un permiso = editarlo.
  const [editing, setEditing] = useState<Permission | 'new' | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    findPermissions()
      .then((list) => {
        if (active) setPermissions(list)
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

  // Sin filtros en el backend: se filtra aquí y se ordena por módulo y recurso.
  const visible = useMemo(() => {
    const text = query.trim().toLowerCase()
    return permissions
      .filter((permission) => !moduleFilter || permission.module === moduleFilter)
      .filter(
        (permission) =>
          !text ||
          permission.model.includes(text) ||
          permission.endpoints.some((endpoint) => endpoint.url.toLowerCase().includes(text)),
      )
      .sort((a, b) => a.module.localeCompare(b.module) || a.model.localeCompare(b.model))
  }, [permissions, query, moduleFilter])

  function upsert(saved: Permission) {
    setPermissions((list) =>
      list.some((permission) => permission.id === saved.id)
        ? list.map((permission) => (permission.id === saved.id ? saved : permission))
        : [...list, saved],
    )
  }

  async function remove(permission: Permission) {
    const name = `${permission.model} · ${OPERATION_LABELS[permission.operation]}`
    if (!window.confirm(`¿Eliminar el permiso ${name}? No se puede si está asignado a algún rol.`)) return
    setBusyId(permission.id)
    setError(null)
    try {
      await deletePermission(permission.id)
      setPermissions((list) => list.filter((item) => item.id !== permission.id))
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
          <h1 className="page__title">Permisos</h1>
          <p className="page__finding">
            {loading ? 'Cargando permisos…' : `${permissions.length} permisos registrados.`}
          </p>
        </div>
        <button type="button" className="button button--primary" onClick={() => setEditing('new')}>
          <KeyRound size={18} aria-hidden="true" />
          Nuevo permiso
        </button>
      </div>

      <section className="panel" aria-label="Lista de permisos">
        <div className="list-filters">
          <label className="list-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar por recurso o URL"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Filtrar por módulo"
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value as ModuleType | '')}
          >
            <option value="">Todos los módulos</option>
            {MODULES.map((key) => (
              <option key={key} value={key}>
                {MODULE_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="login__error list-error" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="empty-state">Cargando permisos…</p>
        ) : visible.length === 0 ? (
          <p className="empty-state">
            {permissions.length === 0 ? 'No hay permisos para mostrar.' : 'Ningún permiso coincide con los filtros.'}
          </p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Módulo</th>
                  <th>Recurso</th>
                  <th>Operación</th>
                  <th>Endpoints</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {visible.map((permission) => {
                  const busy = busyId === permission.id
                  return (
                    <tr key={permission.id}>
                      <td>{MODULE_LABELS[permission.module]}</td>
                      <td className="data-table__strong">{resourceLabel(permission.model)}</td>
                      <td>{OPERATION_LABELS[permission.operation]}</td>
                      <td className="endpoint-list">
                        {permission.endpoints.map((endpoint) => (
                          <code key={`${endpoint.method} ${endpoint.url}`}>
                            {endpoint.method} {endpoint.url}
                          </code>
                        ))}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-button icon-button--small"
                            title="Editar"
                            aria-label={`Editar el permiso ${permission.model}`}
                            disabled={busy}
                            onClick={() => setEditing(permission)}
                          >
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="icon-button icon-button--small row-actions__delete"
                            title="Eliminar"
                            aria-label={`Eliminar el permiso ${permission.model}`}
                            disabled={busy}
                            onClick={() => remove(permission)}
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
        <PermissionFormDialog
          permission={editing === 'new' ? null : editing}
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
