import { Boxes, CircleUserRound, KeyRound, Scale, ShieldCheck, ShieldUser, ShieldX, TriangleAlert, Users } from 'lucide-react'

export interface RoleStats {
  available: number
  assigned: number
  modulesWithAccess: number
  pendingChanges: number
}

interface RoleSummaryProps {
  roleName: string | null
  usersCount: number | null
  stats: RoleStats
}

function format(value: number | null): string {
  return value === null ? '—' : String(value)
}

export function RoleSummary({ roleName, usersCount, stats }: RoleSummaryProps) {
  const unassigned = Math.max(0, stats.available - stats.assigned)
  const isActive = stats.assigned > 0

  return (
    <aside className="summary" aria-label="Resumen del rol">
      <section className="card summary__card">
        <h2 className="card__title card__title--accent">
          <CircleUserRound size={28} strokeWidth={1.75} aria-hidden="true" />
          Resumen del rol
        </h2>

        <dl className="summary__facts">
          <div>
            <dt>Nombre del rol:</dt>
            <dd className="summary__role-name">{roleName ?? '—'}</dd>
          </div>
          <div>
            <dt>Estado:</dt>
            <dd>
              <span className={`badge ${isActive ? 'badge--success' : 'badge--muted'}`}>
                <span className="status-dot" aria-hidden="true" />
                {isActive ? 'Activo' : 'Sin permisos'}
              </span>
            </dd>
          </div>
        </dl>

        <dl className="summary__metrics">
          <div>
            <dt>
              <Users size={20} aria-hidden="true" className="metric-icon metric-icon--muted" />
              Usuarios asociados:
            </dt>
            <dd>{format(usersCount)}</dd>
          </div>
          <div>
            <dt>
              <KeyRound size={20} aria-hidden="true" className="metric-icon metric-icon--gold" />
              Total permisos asignados:
            </dt>
            <dd>{stats.assigned}</dd>
          </div>
          <div>
            <dt>
              <Boxes size={20} aria-hidden="true" className="metric-icon metric-icon--muted" />
              Módulos con acceso:
            </dt>
            <dd>{stats.modulesWithAccess}</dd>
          </div>
        </dl>

        <div className="tiles">
          <div className="tile">
            <ShieldUser size={30} strokeWidth={1.5} aria-hidden="true" className="tile__icon" />
            <span className="tile__label">Total permisos disponibles</span>
            <span className="tile__value tile__value--total">{stats.available}</span>
          </div>
          <div className="tile tile--assigned">
            <ShieldCheck size={30} strokeWidth={1.5} aria-hidden="true" className="tile__icon" />
            <span className="tile__label">Asignados</span>
            <span className="tile__value tile__value--assigned">{stats.assigned}</span>
          </div>
          <div className="tile">
            <ShieldX size={30} strokeWidth={1.5} aria-hidden="true" className="tile__icon" />
            <span className="tile__label">No asignados</span>
            <span className="tile__value">{unassigned}</span>
          </div>
        </div>

        {stats.pendingChanges > 0 && (
          <p className="summary__pending" role="status">
            {stats.pendingChanges === 1
              ? '1 cambio sin guardar'
              : `${stats.pendingChanges} cambios sin guardar`}
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="card__title">Leyenda</h2>
        <ul className="legend">
          <li>
            <span className="checkbox checkbox--sample is-checked" aria-hidden="true" />
            Permiso asignado
          </li>
          <li>
            <span className="checkbox checkbox--sample" aria-hidden="true" />
            Permiso no asignado
          </li>
          <li>
            <span className="checkbox checkbox--sample is-checked is-dirty" aria-hidden="true" />
            Cambio sin guardar
          </li>
          <li>
            <span className="checkbox-unavailable" aria-hidden="true" />
            No disponible para el recurso
          </li>
        </ul>
      </section>

      <section className="card">
        <h2 className="card__title">
          <Scale size={26} strokeWidth={1.75} aria-hidden="true" />
          Reglas de acceso
        </h2>
        <ul className="rules">
          <li>Si al menos uno de los roles del usuario posee el permiso, la operación se permite.</li>
          <li>Si ninguno de sus roles posee el permiso requerido, el acceso se deniega.</li>
          <li>Los cambios aplican a todos los usuarios que tengan asignado este rol.</li>
        </ul>
      </section>

      <p className="callout callout--danger">
        <TriangleAlert size={26} strokeWidth={1.75} aria-hidden="true" />
        Retirar un permiso del rol no elimina el permiso del sistema.
      </p>
    </aside>
  )
}
