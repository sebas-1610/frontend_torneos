import {
  IdCard,
  LogIn,
  Mail,
  Pencil,
  ShieldCheck,
  ShieldUser,
  Trash2,
  UserPlus,
  UserRoundCheck,
  UserRoundX,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { User } from '../../api/auth'
import { errorMessage } from '../../api/client'
import { deleteUser, disableUser, enableUser, findUsers } from '../../api/users'
import { RESOURCES, useAccess } from '../../auth/access'
import type { ActionError } from '../../components/ActionAlert'
import { SubjectUser } from '../../components/ConfirmDialog'
import { ListPanel, ListToolbar, RowAction, RowActions, StatusPill, ToolbarButton } from '../../components/ListView'
import { PageHeading } from '../../components/PageHeading'
import { PlayerAvatar } from '../../components/PlayerAvatar'
import { SortHeader } from '../../components/SortHeader'
import { useConfirm } from '../../hooks/useConfirm'
import { useLoadList } from '../../hooks/useLoadList'
import { useSort } from '../../hooks/useSort'
import { useToast } from '../../hooks/useToast'
import { plural } from '../../utils/plural'
import { normalize } from '../roles/labels'
import { UserFormDialog } from './UserFormDialog'
import { UserProfileDialog } from './UserProfileDialog'
import { UserRolesDialog } from './UserRolesDialog'

type StatusFilter = '' | 'activos' | 'inactivos'
type SortKey = 'name' | 'access' | 'status' | 'twoFactor'

const PROVIDER_LABELS: Record<User['authProvider'], string> = {
  LOCAL: 'Correo',
  GOOGLE: 'Google',
  GITHUB: 'GitHub',
  MICROSOFT: 'Microsoft',
}

// Qué se compara al ordenar por cada columna (useSort).
const SORT_VALUES: Record<SortKey, (user: User) => string | number | null> = {
  name: (user) => user.name,
  access: (user) => PROVIDER_LABELS[user.authProvider] ?? user.authProvider,
  status: (user) => (user.enabled ? 'Activo' : 'Inactivo'),
  twoFactor: (user) => (user.twoFactorEnabled ? 'Activa' : 'No'),
}

interface UsersPageProps {
  onOwnPhotoChange: (photo: string | null) => void // al editar el propio perfil desde la lista
}

// Pantalla "Usuarios": lista con búsqueda, filtro de estado y orden por columna; crear, editar,
// activar/desactivar y eliminar. Desde cada fila se abre su perfil y sus roles (HU-SE-01).
export function UsersPage({ onOwnPhotoChange }: UsersPageProps) {
  const { can, userId } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const { showToast, toast } = useToast()
  const { items: users, setItems: setUsers, loading, loadError, retry } = useLoadList(findUsers)
  // Lo que el backend respondió al rechazar una acción.
  const [actionError, setActionError] = useState<ActionError | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('')
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

  // El backend no filtra ni pagina: la búsqueda (nombre o correo, sin tildes) y el estado se aplican aquí.
  const filtered = useMemo(() => {
    const text = normalize(query.trim())
    return users.filter(
      (user) =>
        (status === '' || user.enabled === (status === 'activos')) &&
        (!text || normalize(user.name).includes(text) || normalize(user.email).includes(text)),
    )
  }, [users, query, status])

  // Sin orden elegido quedan como llegan del backend.
  const { sorted: visible, sort, toggleSort } = useSort(filtered, SORT_VALUES)

  const activeCount = users.filter((user) => user.enabled).length
  const withTwoFactor = users.filter((user) => user.twoFactorEnabled).length
  const finding = loading
    ? 'Cargando usuarios…'
    : loadError
      ? 'No se pudo cargar la lista de usuarios.'
      : `${plural(users.length, 'usuario registrado', 'usuarios registrados')}, ` +
        `${activeCount} ${activeCount === 1 ? 'activo' : 'activos'}. ` +
        `${withTwoFactor} con la verificación en dos pasos activa.`

  function upsert(saved: User) {
    setUsers((list) =>
      list.some((user) => user.id === saved.id)
        ? list.map((user) => (user.id === saved.id ? saved : user))
        : [...list, saved],
    )
  }

  // Sin panel de detalle, el aviso de una acción rechazada sale arriba de la lista.
  async function runAction(user: User, failTitle: string, action: () => Promise<void>) {
    setBusyId(user.id)
    setActionError(null)
    try {
      await action()
    } catch (err) {
      setActionError({ title: failTitle, message: errorMessage(err) })
    } finally {
      setBusyId(null)
    }
  }

  async function toggleEnabled(user: User) {
    if (user.enabled) {
      const confirmed = await confirm({
        title: `¿Desactivar a ${user.name}?`,
        message:
          'Se cierran todas sus sesiones y no podrá volver a entrar hasta que lo actives. Sus roles se conservan.',
        confirmLabel: 'Desactivar usuario',
        tone: 'neutral',
        subject: <SubjectUser name={user.name} email={user.email} />,
      })
      if (!confirmed) return
    }
    const failTitle = user.enabled ? `No se pudo desactivar a ${user.name}` : `No se pudo activar a ${user.name}`
    await runAction(user, failTitle, async () => {
      const saved = await (user.enabled ? disableUser(user.id) : enableUser(user.id))
      upsert(saved)
      showToast(saved.enabled ? `${saved.name} quedó activo.` : `${saved.name} quedó desactivado.`)
    })
  }

  async function remove(user: User) {
    const confirmed = await confirm({
      title: `¿Eliminar a ${user.name}?`,
      message:
        'Se borran su perfil, sus asignaciones de roles y sus sesiones. Los roles y permisos del sistema no cambian.',
      confirmLabel: 'Eliminar usuario',
      subject: <SubjectUser name={user.name} email={user.email} />,
    })
    if (!confirmed) return
    await runAction(user, `No se pudo eliminar a ${user.name}`, async () => {
      await deleteUser(user.id)
      setUsers((list) => list.filter((item) => item.id !== user.id))
      showToast(`Se eliminó a ${user.name}.`)
    })
  }

  return (
    <div className="page page--vivid">
      <PageHeading icon={Users} title="Usuarios" finding={finding} />

      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Buscar por nombre o correo"
        actions={
          canCreate && <ToolbarButton primary icon={UserPlus} label="Nuevo usuario" onClick={() => setEditing('new')} />
        }
      >
        <select
          aria-label="Filtrar por estado"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
        >
          <option value="">Todos los estados</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </select>
      </ListToolbar>

      <ListPanel
        title="Lista de usuarios"
        titleId="users-list-title"
        noun={['usuario', 'usuarios']}
        total={users.length}
        shown={visible.length}
        loading={loading}
        loadError={loadError}
        onRetry={retry}
        emptyMessage={
          visible.length > 0
            ? null
            : users.length === 0
              ? 'No hay usuarios para mostrar.'
              : 'Ningún usuario coincide con la búsqueda.'
        }
        error={actionError}
        onDismissError={() => setActionError(null)}
      >
        <div className="table-scroll">
          <table className="data-table data-table--rows">
            <thead>
              <tr>
                <SortHeader label="Usuario" sortKey="name" sort={sort} onSort={toggleSort} />
                <SortHeader
                  label="Acceso"
                  sortKey="access"
                  sort={sort}
                  onSort={toggleSort}
                  className="data-table__optional"
                />
                <SortHeader
                  label="Estado"
                  sortKey="status"
                  sort={sort}
                  onSort={toggleSort}
                  className="data-table__optional"
                />
                <SortHeader
                  label="2FA"
                  sortKey="twoFactor"
                  sort={sort}
                  onSort={toggleSort}
                  className="data-table__optional"
                />
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((user) => {
                const busy = busyId === user.id
                // El backend no deja que alguien se desactive o se elimine a sí mismo (AdminGuard).
                const isOwn = user.id === userId
                return (
                  <tr key={user.id} className={user.enabled ? undefined : 'is-inactive'}>
                    <td className="data-table__name">
                      <span className="role-cell">
                        <PlayerAvatar player={user} />
                        <span className="cell-lines">
                          <span className="data-table__strong">
                            {user.name}
                            {isOwn && <span className="cell-lines__own"> (tú)</span>}
                          </span>
                          <span className="cell-lines__detail">{user.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className="data-table__optional">
                      <span className="icon-text">
                        {user.authProvider === 'LOCAL' ? (
                          <Mail size={14} aria-hidden="true" />
                        ) : (
                          <LogIn size={14} aria-hidden="true" />
                        )}
                        {PROVIDER_LABELS[user.authProvider] ?? user.authProvider}
                      </span>
                    </td>
                    <td className="data-table__optional">
                      <StatusPill active={user.enabled} />
                    </td>
                    <td className="data-table__optional">
                      {user.twoFactorEnabled ? (
                        <span className="icon-text icon-text--on">
                          <ShieldCheck size={16} aria-hidden="true" />
                          Activa
                        </span>
                      ) : (
                        <span className="dash">No</span>
                      )}
                    </td>
                    <RowActions>
                      {canSeeProfile && (
                        <RowAction
                          icon={IdCard}
                          title="Perfil"
                          label={`Perfil de ${user.name}`}
                          disabled={busy}
                          onClick={() => setProfileOf(user)}
                        />
                      )}
                      {canSeeRoles && (
                        <RowAction
                          icon={ShieldUser}
                          title="Roles"
                          label={`Roles de ${user.name}`}
                          disabled={busy}
                          onClick={() => setRolesOf(user)}
                        />
                      )}
                      {canUpdate && (
                        <>
                          <RowAction
                            icon={Pencil}
                            title="Editar"
                            label={`Editar a ${user.name}`}
                            disabled={busy}
                            onClick={() => setEditing(user)}
                          />
                          <RowAction
                            icon={user.enabled ? UserRoundX : UserRoundCheck}
                            tone={user.enabled ? 'red' : 'green'}
                            title={
                              isOwn ? 'No puedes desactivar tu propia cuenta' : user.enabled ? 'Desactivar' : 'Activar'
                            }
                            label={`${user.enabled ? 'Desactivar' : 'Activar'} a ${user.name}`}
                            disabled={busy || isOwn}
                            onClick={() => toggleEnabled(user)}
                          />
                        </>
                      )}
                      {canDelete && (
                        <RowAction
                          icon={Trash2}
                          tone="red"
                          title={isOwn ? 'No puedes eliminar tu propia cuenta' : 'Eliminar'}
                          label={`Eliminar a ${user.name}`}
                          disabled={busy || isOwn}
                          onClick={() => remove(user)}
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
        <UserFormDialog
          user={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            showToast(editing === 'new' ? `${saved.name} quedó registrado.` : 'Cambios guardados.')
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
      {toast}
    </div>
  )
}
