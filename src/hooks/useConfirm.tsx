import { useCallback, useState, type ReactNode } from 'react'
import { ConfirmDialog, type ConfirmOptions } from '../components/ConfirmDialog'

interface PendingConfirm {
  options: ConfirmOptions
  resolve: (confirmed: boolean) => void
}

// Pide confirmación con la ventana del proyecto en lugar de window.confirm:
//   const { confirm, confirmDialog } = useConfirm()
//   if (!(await confirm({ title, message, confirmLabel }))) return
// confirmDialog va en el JSX del componente, fuera de otros <dialog>.
export function useConfirm(): { confirm: (options: ConfirmOptions) => Promise<boolean>; confirmDialog: ReactNode } {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ options, resolve })),
    [],
  )

  const confirmDialog = pending && (
    <ConfirmDialog
      {...pending.options}
      onClose={(confirmed) => {
        setPending(null)
        pending.resolve(confirmed)
      }}
    />
  )

  return { confirm, confirmDialog }
}
