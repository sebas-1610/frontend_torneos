import { CircleAlert, CircleCheck, Info, LoaderCircle, RotateCcw, Save, SquarePlus, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { errorMessage } from '../../api/client'
import {
  findPermissionMatrix,
  findRoles,
  findUsersByRole,
  updatePermissionMatrix,
  type PermissionMatrix,
  type Role,
} from '../../api/security'
import { MatrixSkeleton, PermissionMatrixTable } from './PermissionMatrixTable'
import { RoleSelect } from './RoleSelect'
import { RoleSummary, type RoleStats } from './RoleSummary'

function assignedIds(matrix: PermissionMatrix | null): Set<number> {
  const ids = new Set<number>()
  matrix?.modules.forEach((module) =>
    module.resources.forEach((resource) =>
      resource.operations.forEach((cell) => {
        if (cell.permissionId !== null && cell.assigned) ids.add(cell.permissionId)
      }),
    ),
  )
  return ids
}

function computeStats(matrix: PermissionMatrix | null, checked: Set<number>, saved: Set<number>): RoleStats {
  let available = 0
  let modulesWithAccess = 0
  matrix?.modules.forEach((module) => {
    let moduleHasAccess = false
    module.resources.forEach((resource) =>
      resource.operations.forEach((cell) => {
        if (cell.permissionId === null) return
        available++
        if (checked.has(cell.permissionId)) moduleHasAccess = true
      }),
    )
    if (moduleHasAccess) modulesWithAccess++
  })

  let pendingChanges = 0
  checked.forEach((id) => {
    if (!saved.has(id)) pendingChanges++
  })
  saved.forEach((id) => {
    if (!checked.has(id)) pendingChanges++
  })

  return { available, assigned: checked.size, modulesWithAccess, pendingChanges }
}

export function RolePermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [usersCount, setUsersCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  // Si se cambia de rol antes de que llegue la respuesta anterior, esa respuesta se descarta.
  const latestRequest = useRef(0)

  const saved = useMemo(() => assignedIds(matrix), [matrix])
  const stats = useMemo(() => computeStats(matrix, checked, saved), [matrix, checked, saved])
  const hasChanges = stats.pendingChanges > 0
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null

  const loadRole = useCallback(async (roleId: number) => {
    const requestId = ++latestRequest.current
    setLoading(true)
    setError(null)
    try {
      const [nextMatrix, users] = await Promise.all([
        findPermissionMatrix(roleId),
        // El conteo de usuarios es informativo: si falla, la matriz se muestra igual.
        findUsersByRole(roleId).catch(() => null),
      ])
      if (requestId !== latestRequest.current) return
      setMatrix(nextMatrix)
      setChecked(assignedIds(nextMatrix))
      setUsersCount(users ? users.length : null)
    } catch (loadError) {
      if (requestId !== latestRequest.current) return
      setMatrix(null)
      setChecked(new Set())
      setError(errorMessage(loadError))
    } finally {
      if (requestId === latestRequest.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    findRoles()
      .then((list) => {
        if (cancelled) return
        setRoles(list)
        const initial = list.find((role) => role.name.toLowerCase() === 'administrador') ?? list[0]
        if (initial) {
          setSelectedRoleId(initial.id)
          void loadRole(initial.id)
        } else {
          setLoading(false)
        }
      })
      .catch((loadError) => {
        if (cancelled) return
        setError(errorMessage(loadError))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadRole])

  useEffect(() => {
    if (!hasChanges) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasChanges])

  function confirmDiscard(): boolean {
    if (!hasChanges) return true
    const changes = stats.pendingChanges === 1 ? '1 cambio sin guardar' : `${stats.pendingChanges} cambios sin guardar`
    return window.confirm(`Tienes ${changes} en el rol ${selectedRole?.name ?? ''}. ¿Quieres descartarlos?`)
  }

  function handleSelectRole(roleId: number) {
    if (roleId === selectedRoleId || !confirmDiscard()) return
    setSelectedRoleId(roleId)
    setNotice(null)
    void loadRole(roleId)
  }

  function handleReload() {
    if (selectedRoleId === null || !confirmDiscard()) return
    setNotice(null)
    void loadRole(selectedRoleId)
  }

  function handleReset() {
    setChecked(new Set(saved))
    setNotice(null)
  }

  function handleToggle(permissionId: number) {
    setNotice(null)
    setChecked((current) => {
      const next = new Set(current)
      if (next.has(permissionId)) next.delete(permissionId)
      else next.add(permissionId)
      return next
    })
  }

  async function handleSave() {
    if (selectedRoleId === null) return
    setSaving(true)
    setError(null)
    try {
      const updated = await updatePermissionMatrix(selectedRoleId, [...checked])
      setMatrix(updated)
      setChecked(assignedIds(updated))
      setNotice('Permisos actualizados correctamente.')
    } catch (saveError) {
      setError(errorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  const busy = loading || saving
  const hasMatrix = matrix !== null && matrix.modules.length > 0

  return (
    <div className="page">
      <div className="page__main">
        <section className="card toolbar" aria-label="Rol y acciones">
          <RoleSelect roles={roles} value={selectedRoleId} disabled={busy} onChange={handleSelectRole} />

          <div className="toolbar__actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={handleReload}
              disabled={busy || selectedRoleId === null}
            >
              <SquarePlus size={20} aria-hidden="true" />
              Cargar permisos
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={handleSave}
              disabled={busy || !hasChanges}
            >
              {saving ? (
                <LoaderCircle size={20} aria-hidden="true" className="spin" />
              ) : (
                <Save size={20} aria-hidden="true" />
              )}
              {saving ? 'Guardando…' : 'Guardar cambios'}
              {hasChanges && !saving && <span className="button__count">{stats.pendingChanges}</span>}
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={handleReset}
              disabled={busy || !hasChanges}
            >
              <RotateCcw size={20} aria-hidden="true" />
              Restablecer
            </button>
          </div>
        </section>

        <div className="notices">
          <div className="notices__feedback" aria-live="polite">
            {notice && (
              <div className="callout callout--success" role="status">
                <CircleCheck size={22} aria-hidden="true" />
                <span>{notice}</span>
                <button
                  type="button"
                  className="callout__close"
                  aria-label="Cerrar mensaje"
                  onClick={() => setNotice(null)}
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            )}
            {error && (
              <div className="callout callout--error" role="alert">
                <CircleAlert size={22} aria-hidden="true" />
                <span>{error}</span>
                <button type="button" className="callout__close" aria-label="Cerrar error" onClick={() => setError(null)}>
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
          <p className="callout callout--info">
            <Info size={22} aria-hidden="true" />
            <span>Los permisos seleccionados se conservarán después de cerrar e iniciar sesión nuevamente.</span>
          </p>
        </div>

        <section className="card matrix-card" aria-labelledby="matrix-title" aria-busy={loading}>
          <h2 id="matrix-title" className="matrix-card__title">
            Matriz de permisos del rol
            {matrix && <span className="visually-hidden"> {matrix.roleName}</span>}
          </h2>

          {loading ? (
            <MatrixSkeleton />
          ) : hasMatrix ? (
            <PermissionMatrixTable
              modules={matrix.modules}
              checked={checked}
              saved={saved}
              disabled={saving}
              onToggle={handleToggle}
            />
          ) : (
            <p className="empty-state">
              {roles.length === 0
                ? 'No hay roles registrados. Crea un rol para poder asignarle permisos.'
                : matrix
                  ? 'No hay permisos registrados en el sistema. Registra permisos para poder asignarlos.'
                  : 'No se pudo cargar la matriz. Usa «Cargar permisos» para intentarlo de nuevo.'}
            </p>
          )}
        </section>
      </div>

      <RoleSummary roleName={matrix?.roleName ?? selectedRole?.name ?? null} usersCount={usersCount} stats={stats} />
    </div>
  )
}
