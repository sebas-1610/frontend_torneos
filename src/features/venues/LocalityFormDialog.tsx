import { Armchair, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '../../api/client'
import { createLocality, MAX_LOCALITY_CAPACITY, updateLocality, type Locality } from '../../api/localities'
import type { Venue } from '../../api/venues'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'

interface LocalityFormDialogProps {
  venue: Venue
  locality: Locality | null // null: crear una nueva en este escenario
  onClose: () => void
  onSaved: (locality: Locality, isNew: boolean) => void
}

// Formulario de localidad (HU-GE-03). Es del escenario donde se crea: el escenario no se cambia. El
// precio no va aquí: se fija por partido en la venta de entradas.
export function LocalityFormDialog({ venue, locality, onClose, onSaved }: LocalityFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isNew = locality === null
  const [name, setName] = useState(locality?.name ?? '')
  const [capacity, setCapacity] = useState(locality ? String(locality.capacity) : '')
  const [description, setDescription] = useState(locality?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  // Mismas reglas que valida el backend (LocalityFieldsDto).
  const trimmedName = name.trim()
  const seats = Number(capacity)
  const capacityOk = /^\d+$/.test(capacity) && seats >= 1 && seats <= MAX_LOCALITY_CAPACITY
  const canSubmit = trimmedName !== '' && trimmedName.length <= 60 && capacityOk && description.length <= 255

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    const input = { name: trimmedName, capacity: seats, description: description.trim() || null }
    try {
      onSaved(isNew ? await createLocality(venue.id, input) : await updateLocality(locality.id, input), isNew)
    } catch (err) {
      setError(errorMessage(err)) // ej: "Ya se vendieron 300 boletos en Norte..."
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="form-dialog" onClose={onClose} aria-labelledby="locality-form-title">
      <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
        <div className="form-dialog__head">
          <span className="panel-head__icon" aria-hidden="true">
            <Armchair size={16} />
          </span>
          <h2 id="locality-form-title" className="panel__title">
            {isNew ? `Nueva localidad en ${venue.name}` : 'Editar localidad'}
          </h2>
          <button
            type="button"
            className="icon-button icon-button--small"
            aria-label="Cerrar"
            onClick={() => dialogRef.current?.close()}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="form-dialog__row">
          <label className="login__field">
            <span>Nombre</span>
            <input
              autoComplete="off"
              maxLength={60}
              placeholder="Ej: Tribuna Norte"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="login__field">
            <span>Capacidad (puestos)</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_LOCALITY_CAPACITY}
              step={1}
              placeholder="Ej: 4500"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </label>
        </div>
        {capacity !== '' && !capacityOk && (
          <p className="field-hint">La capacidad es un número entero entre 1 y 200.000.</p>
        )}

        <label className="login__field">
          <span>Descripción (opcional)</span>
          <textarea
            rows={2}
            maxLength={255}
            placeholder="Ej: Cubierta, con sillas numeradas"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

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
            {loading ? 'Guardando…' : 'Guardar localidad'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
