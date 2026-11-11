import { Camera, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { PlayerAvatar } from '../../components/PlayerAvatar'
import { photoFromFile } from '../../utils/image'

interface PhotoFieldProps {
  // Con qué dibujar la vista previa: la foto elegida o, si no hay, las iniciales.
  player: { id: number; firstName: string; lastName: string; photo: string | null }
  onChange: (photo: string | null) => void
}

// Campo "Foto" del formulario de jugador: se elige una imagen del equipo, el navegador la recorta y
// la reduce (utils/image.ts) y aquí queda lista para enviarse con los demás datos.
export function PhotoField({ player, onChange }: PhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setReading(true)
    try {
      onChange(await photoFromFile(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer la imagen.')
    } finally {
      setReading(false)
      // Se limpia para poder elegir otra vez el mismo archivo.
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="photo-field">
      <PlayerAvatar player={player} size="lg" />
      <div className="photo-field__body">
        <p className="photo-field__label">Foto (opcional)</p>
        <div className="photo-field__actions">
          <button
            type="button"
            className="button button--outline"
            disabled={reading}
            onClick={() => inputRef.current?.click()}
          >
            <Camera size={16} aria-hidden="true" />
            {reading ? 'Leyendo…' : player.photo ? 'Cambiar foto' : 'Subir foto'}
          </button>
          {player.photo && (
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
          <p className="photo-field__error" role="alert">
            {error}
          </p>
        ) : (
          <p className="photo-field__hint">JPG, PNG o WEBP. Se recorta en cuadrado.</p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        aria-label="Elegir foto del jugador"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  )
}
