import { ShieldAlert, X } from 'lucide-react'

// Lo que el backend respondió al rechazar una acción: qué no se pudo hacer y por qué.
export interface ActionError {
  title: string // ej: "No se pudo eliminar el equipo"
  message: string // el motivo, tal como lo dice el backend
}

interface ActionAlertProps {
  error: ActionError
  onDismiss: () => void
}

// Aviso rojo de una acción rechazada (ej: eliminar un equipo que tiene contratos). Va en el detalle
// del elemento afectado y se cierra con la X.
export function ActionAlert({ error, onDismiss }: ActionAlertProps) {
  return (
    <div className="alert" role="alert">
      <ShieldAlert size={20} aria-hidden="true" />
      <div className="alert__text">
        <p className="alert__title">{error.title}</p>
        <p>{error.message}</p>
      </div>
      <button type="button" className="icon-button icon-button--small" aria-label="Cerrar aviso" onClick={onDismiss}>
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
