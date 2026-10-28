import { ChevronDown } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import type { PermissionMatrixModule } from '../../api/security'
import { AnimatedNumber } from '../../components/AnimatedNumber'
import { MODULE_LABELS, OPERATIONS, resourceIcon, resourceLabel } from './labels'

interface PermissionMatrixTableProps {
  // Al cambiar de rol las filas se vuelven a montar y entran en cascada.
  roleId: number
  modules: PermissionMatrixModule[]
  checked: Set<number>
  saved: Set<number>
  disabled: boolean
  onToggle: (permissionId: number) => void
}

function CheckMark() {
  return (
    <svg className="check__mark" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.5 12.5l4.2 4.2L18.5 8" />
    </svg>
  )
}

export function PermissionMatrixTable({ roleId, modules, checked, saved, disabled, onToggle }: PermissionMatrixTableProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  // La última casilla tocada se "estampa"; el contador reinicia la animación aunque se toque la misma dos veces.
  const [pulse, setPulse] = useState<{ id: number; count: number } | null>(null)

  function toggleModule(module: string) {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(module)) next.delete(module)
      else next.add(module)
      return next
    })
  }

  function handleToggle(permissionId: number) {
    setPulse((current) => ({ id: permissionId, count: (current?.count ?? 0) + 1 }))
    onToggle(permissionId)
  }

  let rowIndex = 0

  return (
    <div className="matrix-scroll">
      <table className="matrix">
        <thead>
          <tr>
            <th scope="col" className="matrix__resource-head">
              Recurso
            </th>
            {OPERATIONS.map((operation) => (
              <th key={operation.key} scope="col">
                {operation.label}
              </th>
            ))}
          </tr>
        </thead>

        {modules.map(({ module, resources }) => {
          const isCollapsed = collapsed.has(module)
          const moduleLabel = MODULE_LABELS[module] ?? module
          const cells = resources.flatMap((resource) => resource.operations)
          const available = cells.filter((cell) => cell.permissionId !== null).length
          const assigned = cells.filter((cell) => cell.permissionId !== null && checked.has(cell.permissionId)).length
          const share = available === 0 ? 0 : assigned / available

          return (
            <tbody key={`${roleId}-${module}`}>
              <tr className="matrix__module" style={{ '--i': rowIndex++ } as CSSProperties}>
                <th scope="colgroup" colSpan={OPERATIONS.length + 1}>
                  <button
                    type="button"
                    className="matrix__module-toggle"
                    aria-expanded={!isCollapsed}
                    onClick={() => toggleModule(module)}
                  >
                    <ChevronDown size={16} aria-hidden="true" className={isCollapsed ? 'is-collapsed' : undefined} />
                    <span className="matrix__module-name">{moduleLabel}</span>
                    <span className="matrix__module-meter" aria-hidden="true">
                      <span style={{ transform: `scaleX(${share})` }} />
                    </span>
                    <span className="matrix__module-count">
                      <AnimatedNumber value={assigned} /> de <span className="num">{available}</span>
                    </span>
                  </button>
                </th>
              </tr>

              {!isCollapsed &&
                resources.map((resource) => {
                  const Icon = resourceIcon(resource.model)
                  const label = resourceLabel(resource.model)
                  return (
                    <tr key={resource.model} className="matrix__row" style={{ '--i': rowIndex++ } as CSSProperties}>
                      <th scope="row" className="matrix__resource">
                        <span className="matrix__resource-label">
                          <Icon size={16} strokeWidth={1.6} aria-hidden="true" />
                          {label}
                        </span>
                      </th>
                      {OPERATIONS.map((operation) => {
                        const cell = resource.operations.find((item) => item.operation === operation.key)
                        const permissionId = cell?.permissionId ?? null

                        if (permissionId === null) {
                          return (
                            <td key={operation.key} className="matrix__cell" data-label={operation.label}>
                              <span className="check-unavailable" title="Permiso no registrado para este recurso">
                                <span className="visually-hidden">
                                  {operation.label} {label}: no disponible
                                </span>
                              </span>
                            </td>
                          )
                        }

                        const isChecked = checked.has(permissionId)
                        const isDirty = isChecked !== saved.has(permissionId)
                        const isPulsing = pulse?.id === permissionId
                        return (
                          <td key={operation.key} className="matrix__cell" data-label={operation.label}>
                            <label className="check">
                              <input
                                type="checkbox"
                                className="check__input"
                                checked={isChecked}
                                disabled={disabled}
                                onChange={() => handleToggle(permissionId)}
                                aria-label={`${operation.label} ${label}${isDirty ? ' (cambio sin guardar)' : ''}`}
                              />
                              <span
                                key={isPulsing ? `pulse-${pulse.count}` : 'rest'}
                                className={`check__box${isDirty ? ' is-dirty' : ''}${isPulsing ? ' is-pulsing' : ''}`}
                                aria-hidden="true"
                              >
                                <CheckMark />
                              </span>
                            </label>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
            </tbody>
          )
        })}
      </table>
    </div>
  )
}

// Cada muestra de la leyenda es la misma marca que explica, a escala.
export function MatrixLegend() {
  return (
    <ul className="legend">
      <li>
        <span className="check__box is-sample is-on" aria-hidden="true">
          <CheckMark />
        </span>
        Permiso asignado
      </li>
      <li>
        <span className="check__box is-sample" aria-hidden="true" />
        Permiso no asignado
      </li>
      <li>
        <span className="check__box is-sample is-on is-dirty" aria-hidden="true">
          <CheckMark />
        </span>
        Cambio sin guardar
      </li>
      <li>
        <span className="check-unavailable" aria-hidden="true" />
        No disponible para el recurso
      </li>
    </ul>
  )
}

// Carga: la misma estructura final con barras planas del tamaño real de cada valor.
export function MatrixSkeleton() {
  return (
    <div className="matrix-skeleton" aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <div key={index} className={`matrix-skeleton__row${index % 4 === 0 ? ' is-group' : ''}`}>
          <span />
          {index % 4 !== 0 && OPERATIONS.map((operation) => <i key={operation.key} />)}
        </div>
      ))}
    </div>
  )
}
