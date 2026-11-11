import { CircleCheck, X } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'

interface Notice {
  id: number // cambia en cada aviso: repite la animación y reinicia el tiempo aunque el texto sea igual
  text: string
}

const VISIBLE_MS = 5000

// Aviso flotante de éxito ("Deporte creado."), igual al de Asignar permisos y Mi perfil:
//   const { showToast, toast } = useToast()
//   showToast('Deporte creado.')
// toast va en el JSX de la pantalla. Se cierra solo a los 5 segundos o con la X.
export function useToast(): { showToast: (text: string) => void; toast: ReactNode } {
  const [notice, setNotice] = useState<Notice | null>(null)

  const showToast = useCallback((text: string) => setNotice({ id: Date.now(), text }), [])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), VISIBLE_MS)
    return () => window.clearTimeout(timer)
  }, [notice])

  const toast = (
    <div className="toast-region" aria-live="polite">
      {notice && (
        <div key={notice.id} className="toast" role="status">
          <CircleCheck size={18} aria-hidden="true" className="toast__icon" />
          <span>{notice.text}</span>
          <button
            type="button"
            className="icon-button icon-button--small"
            aria-label="Cerrar mensaje"
            onClick={() => setNotice(null)}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )

  return { showToast, toast }
}
