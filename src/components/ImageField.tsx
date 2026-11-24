import { Camera, ImageDown, Trash2 } from 'lucide-react'
import { useId, useRef, useState, type ReactNode } from 'react'
import { useFileDrop } from '../hooks/useFileDrop'
import './ImageField.css'

interface ImageFieldProps {
  label: string // ej: "Escudo (opcional)"
  hint: string // qué archivos sirven y qué se le hace
  preview: ReactNode // cómo se ve ya guardada (o lo que se muestra mientras no hay)
  value: string | null
  read: (file: File) => Promise<string> // la reduce (utils/image.ts); lanza Error con el mensaje
  uploadLabel: string // "Subir escudo"
  changeLabel: string // "Cambiar escudo"
  inputLabel: string // para el lector de pantalla: "Elegir escudo del equipo"
  onChange: (value: string | null) => void
  droppable?: boolean // además del botón, se puede arrastrar el archivo y soltarlo encima
  disabled?: boolean // mientras se guarda
  readOnly?: boolean // sin permiso para cambiarla: se ve, pero sin botones
}

// Campo de imagen de los formularios (foto del jugador, escudo del equipo, foto del perfil): se elige
// un archivo, o se suelta encima si es droppable; el navegador lo reduce y aquí queda listo para
// enviarse con los demás datos.
export function ImageField({
  label,
  hint,
  preview,
  value,
  read,
  uploadLabel,
  changeLabel,
  inputLabel,
  onChange,
  droppable = false,
  disabled = false,
  readOnly = false,
}: ImageFieldProps) {
  const labelId = useId()
  const hintId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [status, setStatus] = useState('') // lo que oye el lector de pantalla

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setStatus('')
    setReading(true)
    try {
      onChange(await read(file))
      setStatus('Imagen lista. Falta guardar.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer la imagen.')
    } finally {
      setReading(false)
      // Se limpia para poder elegir otra vez el mismo archivo.
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleDrop(files: FileList) {
    if (files.length === 1) void handleFile(files[0])
    else if (files.length > 1) setError('Suelta una sola imagen.')
    else setError('No llegó ningún archivo. Elige la imagen con el botón.')
  }

  function handleRemove() {
    setError(null)
    setStatus('Imagen quitada. Falta guardar.')
    onChange(null)
    // "Quitar" desaparece: el foco pasa al botón de subir para no perderse.
    buttonRef.current?.focus()
  }

  const receivesDrop = droppable && !readOnly
  const { dragging, zoneProps } = useFileDrop({
    active: receivesDrop,
    paused: disabled || reading,
    onDrop: handleDrop,
  })

  return (
    <div
      className={`image-field ${receivesDrop ? 'image-field--droppable' : ''} ${dragging ? 'is-dragging' : ''}`}
      role="group"
      aria-labelledby={labelId}
      {...zoneProps}
    >
      {preview}
      <div className="image-field__body">
        <p id={labelId} className="image-field__label">
          {label}
        </p>
        {!readOnly && (
          <>
            <div className="image-field__actions">
              <button
                ref={buttonRef}
                type="button"
                className="button button--outline"
                aria-describedby={hintId}
                disabled={disabled || reading}
                onClick={() => inputRef.current?.click()}
              >
                <Camera size={16} aria-hidden="true" />
                {reading ? 'Leyendo…' : value ? changeLabel : uploadLabel}
              </button>
              {value && (
                <button
                  type="button"
                  className="button button--text row-actions__danger"
                  disabled={disabled}
                  onClick={handleRemove}
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Quitar
                </button>
              )}
            </div>
            {error ? (
              <p id={hintId} className="image-field__error" role="alert">
                {error}
              </p>
            ) : (
              <p id={hintId} className="image-field__hint">
                {droppable && <span className="image-field__drop-hint">Arrástrala aquí o elígela con el botón. </span>}
                {hint}
              </p>
            )}
            <p className="visually-hidden" role="status">
              {status}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              aria-label={inputLabel}
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
          </>
        )}
      </div>
      {dragging && (
        <span className="image-field__drop" aria-hidden="true">
          <ImageDown size={20} strokeWidth={1.8} />
          Suelta la imagen aquí
        </span>
      )}
    </div>
  )
}
