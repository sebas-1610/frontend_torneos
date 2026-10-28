import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { PermissionMatrixModule } from '../../api/security'
import { MODULE_LABELS, OPERATIONS, resourceIcon, resourceLabel } from './labels'

interface PermissionMatrixTableProps {
  modules: PermissionMatrixModule[]
  checked: Set<number>
  saved: Set<number>
  disabled: boolean
  onToggle: (permissionId: number) => void
}

export function PermissionMatrixTable({ modules, checked, saved, disabled, onToggle }: PermissionMatrixTableProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggleModule(module: string) {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(module)) next.delete(module)
      else next.add(module)
      return next
    })
  }

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

          return (
            <tbody key={module}>
              <tr className="matrix__module">
                <th scope="colgroup" colSpan={OPERATIONS.length + 1}>
                  <button
                    type="button"
                    className="matrix__module-toggle"
                    aria-expanded={!isCollapsed}
                    onClick={() => toggleModule(module)}
                  >
                    <ChevronDown size={18} aria-hidden="true" className={isCollapsed ? 'is-collapsed' : undefined} />
                    <span>{moduleLabel}</span>
                    <span className="matrix__module-count">
                      {assigned} de {available}
                    </span>
                  </button>
                </th>
              </tr>

              {!isCollapsed &&
                resources.map((resource) => {
                  const Icon = resourceIcon(resource.model)
                  const label = resourceLabel(resource.model)
                  return (
                    <tr key={resource.model} className="matrix__row">
                      <th scope="row" className="matrix__resource">
                        <span className="matrix__resource-label">
                          <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                          {label}
                        </span>
                      </th>
                      {OPERATIONS.map((operation) => {
                        const cell = resource.operations.find((item) => item.operation === operation.key)
                        const permissionId = cell?.permissionId ?? null

                        if (permissionId === null) {
                          return (
                            <td key={operation.key} className="matrix__cell is-unavailable">
                              <span className="checkbox-unavailable" title="Permiso no registrado para este recurso">
                                <span className="visually-hidden">
                                  {operation.label} {label}: no disponible
                                </span>
                              </span>
                            </td>
                          )
                        }

                        const isChecked = checked.has(permissionId)
                        const isDirty = isChecked !== saved.has(permissionId)
                        return (
                          <td key={operation.key} className="matrix__cell">
                            <label className="matrix__hit">
                              <input
                                type="checkbox"
                                className={`checkbox${isDirty ? ' is-dirty' : ''}`}
                                checked={isChecked}
                                disabled={disabled}
                                onChange={() => onToggle(permissionId)}
                                aria-label={`${operation.label} ${label}${isDirty ? ' (cambio sin guardar)' : ''}`}
                              />
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
