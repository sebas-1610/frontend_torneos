import { Plus, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '../../api/client'
import {
  createPermission,
  updatePermission,
  type Endpoint,
  type HttpMethod,
  type Permission,
} from '../../api/permissions'
import type { ModuleType, Operation } from '../../api/security'
import { MODULE_LABELS, OPERATIONS } from '../roles/labels'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const MODULES = Object.keys(MODULE_LABELS) as ModuleType[]

// Mismas reglas que valida el backend (BasePermissionDTO y EndpointRequestDTO).
const MODEL_PATTERN = /^[a-z][a-z0-9-]*$/
const URL_PATTERN = /^\/\S*$/

interface PermissionFormDialogProps {
  permission: Permission | null // null: crear uno nuevo
  onClose: () => void
  onSaved: (permission: Permission) => void
}

export function PermissionFormDialog({ permission, onClose, onSaved }: PermissionFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isNew = permission === null
  const [module, setModule] = useState<ModuleType>(permission?.module ?? 'ADMINISTRACION')
  const [model, setModel] = useState(permission?.model ?? '')
  const [operation, setOperation] = useState<Operation>(permission?.operation ?? 'LIST')
  const [endpoints, setEndpoints] = useState<Endpoint[]>(permission?.endpoints ?? [{ url: '', method: 'GET' }])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const modelOk = MODEL_PATTERN.test(model)
  const endpointsOk = endpoints.length > 0 && endpoints.every((endpoint) => URL_PATTERN.test(endpoint.url))
  const canSubmit = modelOk && endpointsOk

  function changeEndpoint(index: number, change: Partial<Endpoint>) {
    setEndpoints((list) => list.map((endpoint, i) => (i === index ? { ...endpoint, ...change } : endpoint)))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    const input = { module, model, operation, endpoints }
    try {
      onSaved(isNew ? await createPermission(input) : await updatePermission(permission.id, input))
    } catch (err) {
      setError(errorMessage(err)) // ej: "Ya existe un permiso para ese modelo y operación"
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="form-dialog" onClose={onClose} aria-labelledby="form-dialog-title">
      <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
        <h2 id="form-dialog-title" className="panel__title">
          {isNew ? 'Nuevo permiso' : 'Editar permiso'}
        </h2>

        <label className="login__field">
          <span>Módulo</span>
          <select value={module} onChange={(e) => setModule(e.target.value as ModuleType)}>
            {MODULES.map((key) => (
              <option key={key} value={key}>
                {MODULE_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        <label className="login__field">
          <span>Recurso</span>
          <input
            autoComplete="off"
            placeholder="ej: usuarios, asignacion-roles"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
        </label>
        {model !== '' && !modelOk && (
          <p className="login__hint">En minúsculas, sin espacios ni tildes. Puede llevar números y guiones.</p>
        )}

        <label className="login__field">
          <span>Operación</span>
          <select value={operation} onChange={(e) => setOperation(e.target.value as Operation)}>
            {OPERATIONS.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {/* Cada permiso habilita una o varias rutas del backend (método + URL). */}
        <fieldset className="endpoints">
          <legend className="endpoints__legend">Endpoints que habilita</legend>
          {endpoints.map((endpoint, index) => (
            <div key={index} className="endpoints__row">
              <select
                aria-label={`Método del endpoint ${index + 1}`}
                value={endpoint.method}
                onChange={(e) => changeEndpoint(index, { method: e.target.value as HttpMethod })}
              >
                {METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
              <input
                aria-label={`URL del endpoint ${index + 1}`}
                placeholder="/api/users/{id}"
                value={endpoint.url}
                onChange={(e) => changeEndpoint(index, { url: e.target.value })}
              />
              <button
                type="button"
                className="icon-button icon-button--small"
                aria-label={`Quitar endpoint ${index + 1}`}
                disabled={endpoints.length === 1}
                onClick={() => setEndpoints((list) => list.filter((_, i) => i !== index))}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="button button--text endpoints__add"
            onClick={() => setEndpoints((list) => [...list, { url: '', method: 'GET' }])}
          >
            <Plus size={16} aria-hidden="true" />
            Agregar endpoint
          </button>
          {/* El aviso sale solo cuando hay una URL escrita mal, no mientras están vacías. */}
          {endpoints.some((endpoint) => endpoint.url !== '' && !URL_PATTERN.test(endpoint.url)) && (
            <p className="login__hint">Cada URL debe empezar por / y no tener espacios.</p>
          )}
        </fieldset>

        {error && (
          <p className="login__error" role="alert">
            {error}
          </p>
        )}

        <div className="form-dialog__actions">
          <button type="button" className="button button--outline" onClick={() => dialogRef.current?.close()}>
            Cancelar
          </button>
          <button type="submit" className="button button--primary" disabled={loading || !canSubmit}>
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
