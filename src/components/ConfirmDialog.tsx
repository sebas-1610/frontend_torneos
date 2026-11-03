import { Info, TriangleAlert, Unlink2, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { RoleMonogram } from '../features/roles/RoleSelect'
import { initials } from '../utils/initials'
import './ConfirmDialog.css'

export interface ConfirmOptions {
  title: string
  message: ReactNode
  confirmLabel: string // el verbo exacto de la acción: "Quitar del rol", "Eliminar usuario"...
  tone?: 'danger' | 'neutral' // danger: la acción borra o quita algo
  subject?: ReactNode // la tira con lo que se afecta (SubjectUser, SubjectRole...)
}

interface ConfirmDialogProps extends ConfirmOptions {
  onClose: (confirmed: boolean) => void
}

// Ventana de confirmación del proyecto (reemplaza window.confirm). Se usa con useConfirm().
export function ConfirmDialog({ title, message, confirmLabel, tone = 'danger', subject, onClose }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmedRef = useRef(false)
  const titleId = useId()
  const messageId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    // El foco empieza en "Cancelar": un Enter distraído no borra nada.
    cancelRef.current?.focus()
  }, [])

  function close(confirmed: boolean) {
    confirmedRef.current = confirmed
    dialogRef.current?.close()
  }

  return (
    <dialog
      ref={dialogRef}
      className={`confirm-dialog confirm-dialog--${tone}`}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      // Escape también cierra (como Cancelar). stopPropagation: si se abre sobre otra ventana,
      // su cierre no debe cerrar también la de abajo.
      onClose={(event) => {
        event.stopPropagation()
        onClose(confirmedRef.current)
      }}
    >
      <div className="confirm-dialog__body">
        <div className="confirm-dialog__head">
          <span className="confirm-dialog__icon" aria-hidden="true">
            {tone === 'danger' ? <TriangleAlert size={18} /> : <Info size={18} />}
          </span>
          <div>
            <h2 id={titleId} className="confirm-dialog__title">
              {title}
            </h2>
            <div id={messageId} className="confirm-dialog__message">
              {message}
            </div>
          </div>
        </div>

        {subject && <div className="confirm-dialog__subject">{subject}</div>}

        <div className="confirm-dialog__actions">
          <button ref={cancelRef} type="button" className="button button--outline" onClick={() => close(false)}>
            Cancelar
          </button>
          <button
            type="button"
            className={`button ${tone === 'danger' ? 'button--danger' : 'button--primary'}`}
            onClick={() => close(true)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}

// Piezas de la tira: muestran exactamente qué se va a afectar, con el mismo avatar y monograma de la app.

export function SubjectUser({ name, email }: { name: string; email: string }) {
  return (
    <span className="subject">
      <span className="avatar subject__avatar" aria-hidden="true">
        {initials(name)}
      </span>
      <span className="subject__text">
        <span className="subject__name">{name}</span>
        <span className="subject__detail">{email}</span>
      </span>
    </span>
  )
}

export function SubjectRole({ name, hue }: { name: string; hue: number }) {
  return (
    <span className="subject">
      <RoleMonogram name={name} hue={hue} size="sm" />
      <span className="subject__text">
        <span className="subject__name">{name}</span>
        <span className="subject__detail">Rol</span>
      </span>
    </span>
  )
}

export function SubjectItem({ icon: Icon, name, detail }: { icon: LucideIcon; name: string; detail: string }) {
  return (
    <span className="subject">
      <span className="subject__glyph" aria-hidden="true">
        <Icon size={16} strokeWidth={1.8} />
      </span>
      <span className="subject__text">
        <span className="subject__name">{name}</span>
        <span className="subject__detail">{detail}</span>
      </span>
    </span>
  )
}

// El vínculo que se rompe entre dos piezas (por ejemplo, un usuario y un rol).
export function SubjectBreak() {
  return (
    <span className="subject-break" aria-hidden="true">
      <Unlink2 size={16} />
    </span>
  )
}
