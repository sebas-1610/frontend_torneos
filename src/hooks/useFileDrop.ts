import { useEffect, useState, type DragEvent as ReactDragEvent } from 'react'

interface FileDropOptions {
  active: boolean // la zona recibe archivos
  paused: boolean // por ahora no (ej: mientras se lee una imagen o se guarda)
  onDrop: (files: FileList) => void
}

// Arrastrar texto o un enlace no cuenta: solo archivos.
function carriesFiles(data: DataTransfer | null): data is DataTransfer {
  return data !== null && data.types.includes('Files')
}

// Zona donde se sueltan archivos arrastrados desde el computador:
//   const { dragging, zoneProps } = useFileDrop({ active, paused, onDrop })
//   <div className={dragging ? 'is-dragging' : ''} {...zoneProps}>
// Solo avisa qué se soltó: qué archivos sirven lo decide quien la usa.
export function useFileDrop({ active, paused, onDrop }: FileDropOptions) {
  const [over, setOver] = useState(false)
  const accepts = active && !paused

  // Soltarlo por fuera de la zona no hace nada. Sin esto, el navegador abriría el archivo en la
  // pestaña y se perdería lo que se estaba editando.
  useEffect(() => {
    if (!active) return
    function ignore(event: DragEvent) {
      if (event.defaultPrevented || !carriesFiles(event.dataTransfer)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'none'
    }
    window.addEventListener('dragover', ignore)
    window.addEventListener('drop', ignore)
    return () => {
      window.removeEventListener('dragover', ignore)
      window.removeEventListener('drop', ignore)
    }
  }, [active])

  const zoneProps = {
    onDragOver(event: ReactDragEvent<HTMLElement>) {
      if (!accepts || !carriesFiles(event.dataTransfer)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
      setOver(true)
    },
    onDragLeave(event: ReactDragEvent<HTMLElement>) {
      // Pasar por encima de un hijo (la foto, un botón) no es salir de la zona.
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
      setOver(false)
    },
    onDrop(event: ReactDragEvent<HTMLElement>) {
      setOver(false)
      if (!accepts || !carriesFiles(event.dataTransfer)) return
      event.preventDefault()
      onDrop(event.dataTransfer.files)
    },
  }

  return { dragging: over && accepts, zoneProps }
}
