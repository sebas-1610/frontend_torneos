import { KeyRound, Pencil, ShieldPlus, ShieldUser, Trash2, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { errorMessage } from '../../api/client'
import { deleteRole } from '../../api/roles'
import { findRoles, type Role } from '../../api/security'
import { RESOURCES, useAccess } from '../../auth/access'
import type { ActionError } from '../../components/ActionAlert'
import { SubjectRole } from '../../components/ConfirmDialog'
import { ListPanel, ListToolbar, RowAction, RowActions, ToolbarButton } from '../../components/ListView'
import { PageHeading } from '../../components/PageHeading'
import { SortHeader } from '../../components/SortHeader'
import { useConfirm } from '../../hooks/useConfirm'
import { useLoadList } from '../../hooks/useLoadList'
import { useSort } from '../../hooks/useSort'
import { useToast } from '../../hooks/useToast'
import { plural } from '../../utils/plural'
import { normalize, roleHue } from './labels'
import { RoleFormDialog } from './RoleFormDialog'
import { RoleMembersDialog } from './RoleMembersDialog'
import { RoleMonogram } from './RoleSelect'

type SortKey = 'name'

const SORT_VALUES: Record<SortKey, (role: Role) => string> = {
  name: (role) => role.name,
}

// Pantalla "Roles": lista de roles con búsqueda para crear, editar, eliminar y manejar sus usuarios.
// Desde cada rol se abren sus usuarios y su matriz de permisos (HU-SE-03).
export function RolesPage() {
  const { can } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const { showToast, toast } = useToast()
  const { items: roles, setItems: setRoles, loading, loadError, retry } = useLoadList(findRoles)
  const [actionError, setActionError] = useState<ActionError | null>(null)
  const [query, setQuery] = useState('')
  // Ventanas abiertas: formulario ('new' o un rol) y usuarios de un rol.
  const [editing, setEditing] = useState<Role | 'new' | null>(null)
  const [membersOf, setMembersOf] = useState<Role | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const canCreate = can(RESOURCES.roles, 'CREATE')
  const canUpdate = can(RESOURCES.roles, 'UPDATE')
  const canDelete = can(RESOURCES.roles, 'DELETE')
  const canSeeMembers = can(RESOURCES.userRoles, 'LIST')
  const canSeeMatrix = can(RESOURCES.rolePermissions, 'VIEW')

  // El backend no filtra: búsqueda por nombre o descripción, sin tildes.
  const filtered = useMemo(() => {
    const text = normalize(query.trim())
    return roles.filter(
      (role) => !text || normalize(role.name).includes(text) || normalize(role.description ?? '').includes(text),
    )
  }, [roles, query])

  const { sorted: visible, sort, toggleSort } = useSort(filtered, SORT_VALUES)

  const finding = loading
    ? 'Cargando roles…'
    : loadError
      ? 'No se pudo cargar la lista de roles.'
      : `${plural(roles.length, 'rol registrado', 'roles registrados')}. ` +
        'Un usuario puede hacer una operación si al menos uno de sus roles tiene el permiso.'

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
    setActionError(null)
    try {
      await deleteRole(role.id) // 400 con el motivo si el rol tiene usuarios
      setRoles((list) => list.filter((item) => item.id !== role.id))
      showToast(`Se eliminó el rol ${role.name}.`)
    } catch (err) {
      setActionError({ title: `No se puede eliminar el rol ${role.name}`, message: errorMessage(err) })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page page--vivid">
      <PageHeading icon={ShieldUser} title="Roles" finding={finding} />

      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Buscar por nombre o descripción"
        actions={
          <>
            {canSeeMatrix && <ToolbarButton icon={KeyRound} label="Asignar permisos" href="#roles-permisos" />}
            {canCreate && (
              <ToolbarButton primary icon={ShieldPlus} label="Nuevo rol" onClick={() => setEditing('new')} />
            )}
          </>
        }
      />

      <ListPanel
        title="Lista de roles"
        titleId="roles-list-title"
        noun={['rol', 'roles']}
        total={roles.length}
        shown={visible.length}
        loading={loading}
        loadError={loadError}
        onRetry={retry}
        emptyMessage={
          visible.length > 0
            ? null
            : roles.length === 0
              ? 'No hay roles para mostrar.'
              : 'Ningún rol coincide con la búsqueda.'
        }
        error={actionError}
        onDismissError={() => setActionError(null)}
      >
        <div className="table-scroll">
          <table className="data-table data-table--rows">
            <thead>
              <tr>
                <SortHeader label="Rol" sortKey="name" sort={sort} onSort={toggleSort} />
                <th className="data-table__optional">Descripción</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((role) => {
                const busy = busyId === role.id
                return (
                  <tr key={role.id}>
                    <td className="data-table__name">
                      <span className="role-cell">
                        <RoleMonogram name={role.name} hue={roleHue(roles, role.id)} size="sm" />
                        <span className="data-table__strong">{role.name}</span>
                      </span>
                    </td>
                    <td className="data-table__optional data-table__wrap">
                      {role.description || <span className="dash">—</span>}
                    </td>
                    <RowActions>
                      {canSeeMembers && (
                        <RowAction
                          icon={Users}
                          title="Usuarios del rol"
                          label={`Usuarios del rol ${role.name}`}
                          disabled={busy}
                          onClick={() => setMembersOf(role)}
                        />
                      )}
                      {/* Abre la matriz con este rol ya elegido (#roles-permisos/{id}). */}
                      {canSeeMatrix && (
                        <RowAction
                          icon={KeyRound}
                          title="Permisos del rol"
                          label={`Permisos del rol ${role.name}`}
                          href={`#roles-permisos/${role.id}`}
                        />
                      )}
                      {canUpdate && (
                        <RowAction
                          icon={Pencil}
                          title="Editar"
                          label={`Editar el rol ${role.name}`}
                          disabled={busy}
                          onClick={() => setEditing(role)}
                        />
                      )}
                      {canDelete && (
                        <RowAction
                          icon={Trash2}
                          tone="red"
                          title="Eliminar"
                          label={`Eliminar el rol ${role.name}`}
                          disabled={busy}
                          onClick={() => remove(role)}
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
        <RoleFormDialog
          role={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            showToast(editing === 'new' ? `El rol ${saved.name} quedó registrado.` : 'Cambios guardados.')
            upsert(saved)
            setEditing(null)
          }}
        />
      )}
      {membersOf && (
        <RoleMembersDialog role={membersOf} hue={roleHue(roles, membersOf.id)} onClose={() => setMembersOf(null)} />
      )}
      {confirmDialog}
      {toast}
    </div>
  )
}
