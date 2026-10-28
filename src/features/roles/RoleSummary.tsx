import { Info, Scale } from 'lucide-react'
import { AnimatedNumber } from '../../components/AnimatedNumber'
import { MatrixLegend } from './PermissionMatrixTable'

export interface RoleStats {
  available: number
  assigned: number
  modulesWithAccess: number
  modulesTotal: number
  pendingChanges: number
}

interface RoleSummaryProps {
  roleName: string | null
  usersCount: number | null
  stats: RoleStats
}

export function RoleSummary({ roleName, usersCount, stats }: RoleSummaryProps) {
  const unassigned = Math.max(0, stats.available - stats.assigned)
  const share = stats.available === 0 ? 0 : stats.assigned / stats.available
  const isActive = stats.assigned > 0

  return (
    <aside className="rail" aria-label="Resumen del rol">
      <section className="panel summary" aria-labelledby="summary-title">
        <h2 id="summary-title" className="panel__title">
          Resumen del rol
        </h2>

        <dl className="facts">
          <div>
            <dt>Nombre del rol</dt>
            <dd className="facts__strong">{roleName ?? '—'}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>
              <span className={`pill ${isActive ? 'pill--positive' : 'pill--neutral'}`}>
                <span className="status-dot" aria-hidden="true" />
                {isActive ? 'Activo' : 'Sin permisos'}
              </span>
            </dd>
          </div>
        </dl>

        <div className="score">
          <p className="score__label">Total permisos asignados</p>
          <p className="score__figure">
            <AnimatedNumber value={stats.assigned} className="score__value" />
            <span className="score__of">
              de <span className="num">{stats.available}</span>
            </span>
          </p>
          <div
            className="meter"
            role="img"
            aria-label={`${stats.assigned} de ${stats.available} permisos asignados`}
          >
            <span style={{ transform: `scaleX(${share})` }} />
          </div>
          <dl className="split">
            <div>
              <dt>Total permisos disponibles</dt>
              <dd>
                <AnimatedNumber value={stats.available} />
              </dd>
            </div>
            <div>
              <dt>Asignados</dt>
              <dd className="split__gold">
                <AnimatedNumber value={stats.assigned} />
              </dd>
            </div>
            <div>
              <dt>No asignados</dt>
              <dd>
                <AnimatedNumber value={unassigned} />
              </dd>
            </div>
          </dl>
        </div>

        <dl className="facts facts--figures">
          <div>
            <dt>Usuarios asociados</dt>
            <dd className="num">{usersCount === null ? <span className="dash">—</span> : usersCount}</dd>
          </div>
          <div>
            <dt>Módulos con acceso</dt>
            <dd>
              <AnimatedNumber value={stats.modulesWithAccess} />
              <span className="unit"> de {stats.modulesTotal}</span>
            </dd>
          </div>
        </dl>

        {stats.pendingChanges > 0 && (
          <p className="summary__pending" role="status">
            {stats.pendingChanges === 1 ? '1 cambio sin guardar' : `${stats.pendingChanges} cambios sin guardar`}
          </p>
        )}
      </section>

      <section className="panel" aria-labelledby="legend-title">
        <h2 id="legend-title" className="panel__title legend__title">
          Leyenda
        </h2>
        <MatrixLegend />
      </section>

      <section className="panel rules" aria-labelledby="rules-title">
        <h2 id="rules-title" className="panel__title">
          <Scale size={17} strokeWidth={1.6} aria-hidden="true" />
          Reglas de acceso
        </h2>
        <ul className="rules__list">
          <li>Si al menos uno de los roles del usuario posee el permiso, la operación se permite.</li>
          <li>Si ninguno de sus roles posee el permiso requerido, el acceso se deniega.</li>
          <li>Los cambios aplican a todos los usuarios que tengan asignado este rol.</li>
        </ul>
        <p className="rules__note">
          <Info size={16} strokeWidth={1.8} aria-hidden="true" />
          Retirar un permiso del rol no elimina el permiso del sistema.
        </p>
      </section>
    </aside>
  )
}
