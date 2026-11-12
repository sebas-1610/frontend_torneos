import { Camera, Trash2 } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

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
}

// Campo de imagen de los formularios (foto del jugador, escudo del equipo): se elige un archivo, el
// navegador lo reduce y aquí queda listo para enviarse con los demás datos.
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
}: ImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setReading(true)
    try {
      onChange(await read(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer la imagen.')
    } finally {
      setReading(false)
      // Se limpia para poder elegir otra vez el mismo archivo.
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="image-field">
      {preview}
      <div className="image-field__body">
        <p className="image-field__label">{label}</p>
        <div className="image-field__actions">
          <button
            type="button"
            className="button button--outline"
            disabled={reading}
            onClick={() => inputRef.current?.click()}
          >
            <Camera size={16} aria-hidden="true" />
            {reading ? 'Leyendo…' : value ? changeLabel : uploadLabel}
          </button>
          {value && (
            <button
              type="button"
              className="button button--text row-actions__danger"
              onClick={() => {
                setError(null)
                onChange(null)
              }}
            >
              <Trash2 size={16} aria-hidden="true" />
              Quitar
            </button>
          )}
        </div>
        {error ? (
          <p className="image-field__error" role="alert">
            {error}
          </p>
        ) : (
          <p className="image-field__hint">{hint}</p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        aria-label={inputLabel}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  )
}
