import { KeyRound, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { errorMessage } from '../../api/client'
import { deletePermission, findPermissions, type Permission } from '../../api/permissions'
import type { ModuleType, Operation } from '../../api/security'
import { RESOURCES, useAccess } from '../../auth/access'
import type { ActionError } from '../../components/ActionAlert'
import { SubjectItem } from '../../components/ConfirmDialog'
import { ListPanel, ListToolbar, RowAction, RowActions, ToolbarButton } from '../../components/ListView'
import { PageHeading } from '../../components/PageHeading'
import { SortHeader } from '../../components/SortHeader'
import { useConfirm } from '../../hooks/useConfirm'
import { useLoadList } from '../../hooks/useLoadList'
import { useSort } from '../../hooks/useSort'
import { useToast } from '../../hooks/useToast'
import { plural } from '../../utils/plural'
import { MODULE_LABELS, OPERATIONS, normalize, resourceIcon, resourceLabel } from '../roles/labels'
import { PermissionFormDialog } from './PermissionFormDialog'

const OPERATION_LABELS = Object.fromEntries(OPERATIONS.map(({ key, label }) => [key, label]))
// En el orden de ModuleType en el backend, el mismo de la matriz.
const MODULES = Object.keys(MODULE_LABELS) as ModuleType[]
const OPERATION_ORDER = OPERATIONS.map(({ key }) => key)

// Cada operación con su color: leer en azul, crear en verde, cambiar en ámbar y borrar en rojo.
const OPERATION_TONES: Record<Operation, string> = {
  VIEW: 'var(--tone-blue)',
  LIST: 'var(--tone-teal)',
  CREATE: 'var(--tone-green)',
  UPDATE: 'var(--tone-amber)',
  DELETE: 'var(--tone-red)',
}

type SortKey = 'resource' | 'module' | 'operation'

const SORT_VALUES: Record<SortKey, (permission: Permission) => string | number> = {
  resource: (permission) => resourceLabel(permission.model),
  module: (permission) => MODULES.indexOf(permission.module),
  operation: (permission) => OPERATION_ORDER.indexOf(permission.operation),
}

// Igual que la matriz: módulo, recurso y operación en el orden de sus columnas (Ver, Listar, Crear...).
function compareByMatrixOrder(a: Permission, b: Permission): number {
  return (
    MODULES.indexOf(a.module) - MODULES.indexOf(b.module) ||
    a.model.localeCompare(b.model) ||
    OPERATION_ORDER.indexOf(a.operation) - OPERATION_ORDER.indexOf(b.operation)
  )
}

// Pantalla "Permisos": cada permiso es recurso + operación (ej: usuarios · Listar) y las rutas que habilita.
export function PermissionsPage() {
  const { can } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const { showToast, toast } = useToast()
  const canCreate = can(RESOURCES.permissions, 'CREATE')
  const canUpdate = can(RESOURCES.permissions, 'UPDATE')
  const canDelete = can(RESOURCES.permissions, 'DELETE')
  const { items: permissions, setItems: setPermissions, loading, loadError, retry } = useLoadList(findPermissions)
  const [actionError, setActionError] = useState<ActionError | null>(null)
  const [query, setQuery] = useState('')
  const [moduleFilter, setModuleFilter] = useState<ModuleType | ''>('')
  // Ventana abierta: null = cerrada, 'new' = crear, un permiso = editarlo.
  const [editing, setEditing] = useState<Permission | 'new' | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  // Sin filtros en el backend: se filtra aquí. El recurso se busca por su nombre en pantalla
  // ("asignación de roles") o como está guardado ("asignacion-roles"), con o sin tildes.
  const filtered = useMemo(() => {
    const text = normalize(query.trim())
    return permissions
      .filter((permission) => !moduleFilter || permission.module === moduleFilter)
      .filter(
        (permission) =>
          !text ||
          normalize(permission.model).includes(text) ||
          normalize(resourceLabel(permission.model)).includes(text) ||
          permission.endpoints.some((endpoint) => endpoint.url.toLowerCase().includes(text)),
      )
      .sort(compareByMatrixOrder)
  }, [permissions, query, moduleFilter])

  // Sin orden elegido, el de la matriz.
  const { sorted: visible, sort, toggleSort } = useSort(filtered, SORT_VALUES)

  const resourcesCount = new Set(permissions.map((permission) => permission.model)).size
  const finding = loading
    ? 'Cargando permisos…'
    : loadError
      ? 'No se pudo cargar la lista de permisos.'
      : `${plural(permissions.length, 'permiso registrado', 'permisos registrados')} ` +
        `sobre ${plural(resourcesCount, 'recurso', 'recursos')}.`

  function nameOf(permission: Permission): string {
    return `${resourceLabel(permission.model)} · ${OPERATION_LABELS[permission.operation]}`
  }

  function upsert(saved: Permission) {
    setPermissions((list) =>
      list.some((permission) => permission.id === saved.id)
        ? list.map((permission) => (permission.id === saved.id ? saved : permission))
        : [...list, saved],
    )
  }

  async function remove(permission: Permission) {
    const name = nameOf(permission)
    const confirmed = await confirm({
      title: `¿Eliminar el permiso ${name}?`,
      message:
        'Sus endpoints dejan de estar habilitados para cualquier rol. ' +
        'Si el permiso está asignado a algún rol, no se puede eliminar: primero retíralo de la matriz.',
      confirmLabel: 'Eliminar permiso',
      subject: (
        <SubjectItem
          icon={KeyRound}
          name={name}
          detail={permission.endpoints.map((endpoint) => `${endpoint.method} ${endpoint.url}`).join(' · ')}
        />
      ),
    })
    if (!confirmed) return
    setBusyId(permission.id)
    setActionError(null)
    try {
      await deletePermission(permission.id) // 400 con el motivo si está asignado a algún rol
      setPermissions((list) => list.filter((item) => item.id !== permission.id))
      showToast(`Se eliminó el permiso ${name}.`)
    } catch (err) {
      setActionError({ title: `No se puede eliminar el permiso ${name}`, message: errorMessage(err) })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page page--vivid">
      <PageHeading icon={KeyRound} title="Permisos" finding={finding} />

      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Buscar por recurso o URL"
        actions={
          canCreate && <ToolbarButton primary icon={KeyRound} label="Nuevo permiso" onClick={() => setEditing('new')} />
        }
      >
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
      </ListToolbar>

      <ListPanel
        title="Lista de permisos"
        titleId="permissions-list-title"
        noun={['permiso', 'permisos']}
        total={permissions.length}
        shown={visible.length}
        loading={loading}
        loadError={loadError}
        onRetry={retry}
        emptyMessage={
          visible.length > 0
            ? null
            : permissions.length === 0
              ? 'No hay permisos para mostrar.'
              : 'Ningún permiso coincide con los filtros.'
        }
        error={actionError}
        onDismissError={() => setActionError(null)}
      >
        <div className="table-scroll">
          <table className="data-table data-table--rows">
            <thead>
              <tr>
                <SortHeader label="Recurso" sortKey="resource" sort={sort} onSort={toggleSort} />
                <SortHeader
                  label="Módulo"
                  sortKey="module"
                  sort={sort}
                  onSort={toggleSort}
                  className="data-table__optional"
                />
                <SortHeader label="Operación" sortKey="operation" sort={sort} onSort={toggleSort} />
                <th className="data-table__optional">Endpoints</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((permission) => {
                const busy = busyId === permission.id
                const Icon = resourceIcon(permission.model)
                const name = nameOf(permission)
                return (
                  <tr key={permission.id}>
                    <td className="data-table__name">
                      <span className="role-cell">
                        <span className="cell-icon" aria-hidden="true">
                          <Icon size={17} />
                        </span>
                        <span className="data-table__strong">{resourceLabel(permission.model)}</span>
                      </span>
                    </td>
                    <td className="data-table__optional">{MODULE_LABELS[permission.module]}</td>
                    <td>
                      <span className="tag" style={{ '--tag': OPERATION_TONES[permission.operation] } as CSSProperties}>
                        {OPERATION_LABELS[permission.operation]}
                      </span>
                    </td>
                    <td className="data-table__optional endpoint-list">
                      {permission.endpoints.map((endpoint) => (
                        <code key={`${endpoint.method} ${endpoint.url}`}>
                          <span className="endpoint-list__method">{endpoint.method}</span> {endpoint.url}
                        </code>
                      ))}
                    </td>
                    <RowActions>
                      {canUpdate && (
                        <RowAction
                          icon={Pencil}
                          title="Editar"
                          label={`Editar el permiso ${name}`}
                          disabled={busy}
                          onClick={() => setEditing(permission)}
                        />
                      )}
                      {canDelete && (
                        <RowAction
                          icon={Trash2}
                          tone="red"
                          title="Eliminar"
                          label={`Eliminar el permiso ${name}`}
                          disabled={busy}
                          onClick={() => remove(permission)}
                        />
                      )}
                    </RowActions>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </ListPanel>

      {editing && (
        <PermissionFormDialog
          permission={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            showToast(editing === 'new' ? `El permiso ${nameOf(saved)} quedó registrado.` : 'Cambios guardados.')
            upsert(saved)
            setEditing(null)
          }}
        />
      )}
      {confirmDialog}
      {toast}
    </div>
  )
}
