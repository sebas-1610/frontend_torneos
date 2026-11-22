import { Building2, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '../../api/client'
import { createVenue, updateVenue, type Venue } from '../../api/venues'
import { ImageField } from '../../components/ImageField'
import { VenuePhoto } from '../../components/VenuePhoto'
import { venuePhotoFromFile } from '../../utils/image'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'

interface VenueFormDialogProps {
  venue: Venue | null // null: crear uno nuevo
  venues: Venue[] // todos: de aquí salen los que pueden contenerlo y las ciudades ya usadas
  initialParentId: number | null // "Agregar escenario adentro" desde el detalle de uno principal
  onClose: () => void
  onSaved: (venue: Venue, isNew: boolean) => void
}

// Formulario de escenario (HU-GE-01). Uno puede estar dentro de otro principal (un coliseo con tres
// canchas); el de adentro usa la dirección y la ciudad del que lo contiene. El estado no va aquí: se
// cambia con Activar / Desactivar.
export function VenueFormDialog({ venue, venues, initialParentId, onClose, onSaved }: VenueFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const citiesId = useId()
  const isNew = venue === null
  const [name, setName] = useState(venue?.name ?? '')
  const [parentId, setParentId] = useState<number | null>(venue ? (venue.parent?.id ?? null) : initialParentId)
  const [address, setAddress] = useState(venue && !venue.parent ? venue.address : '')
  const [city, setCity] = useState(venue && !venue.parent ? venue.city : '')
  const [description, setDescription] = useState(venue?.description ?? '')
  const [photo, setPhoto] = useState(venue?.photo ?? null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  // Pueden contenerlo los principales activos (el actual se conserva aunque se haya desactivado). Uno
  // que ya tiene escenarios adentro debe seguir siendo principal: solo un nivel.
  const hasChildren = (venue?.children.length ?? 0) > 0
  const parents = venues
    .filter((candidate) => !candidate.parent && candidate.id !== venue?.id)
    .filter((candidate) => candidate.active || candidate.id === parentId)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const parent = venues.find((candidate) => candidate.id === parentId) ?? null
  const cities = [...new Set(venues.filter((item) => !item.parent).map((item) => item.city))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  )

  // Mismas reglas que valida el backend (CreateVenueDto).
  const trimmedName = name.trim()
  const isMain = parentId === null
  const canSubmit =
    trimmedName !== '' &&
    trimmedName.length <= 80 &&
    description.length <= 255 &&
    (!isMain || (address.trim() !== '' && address.trim().length <= 150 && city.trim() !== '' && city.trim().length <= 60))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    const input = {
      name: trimmedName,
      address: isMain ? address.trim() : null,
      city: isMain ? city.trim() : null,
      description: description.trim() || null,
      photo,
      parentId,
    }
    try {
      onSaved(isNew ? await createVenue(input) : await updateVenue(venue.id, input), isNew)
    } catch (err) {
      setError(errorMessage(err)) // ej: 409 "Ya existe un escenario llamado... en Manizales"
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="form-dialog form-dialog--wide"
      onClose={onClose}
      aria-labelledby="venue-form-title"
    >
      <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
        <div className="form-dialog__head">
          <span className="panel-head__icon" aria-hidden="true">
            <Building2 size={16} />
          </span>
          <h2 id="venue-form-title" className="panel__title">
            {isNew ? 'Nuevo escenario' : 'Editar escenario'}
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

        <ImageField
          label="Foto (opcional)"
          hint="JPG, PNG o WEBP. Se recorta apaisada, centrada."
          preview={<VenuePhoto venue={{ id: venue?.id ?? 0, name: name || 'Escenario', photo }} size="lg" />}
          value={photo}
          read={venuePhotoFromFile}
          uploadLabel="Subir foto"
          changeLabel="Cambiar foto"
          inputLabel="Elegir foto del escenario"
          onChange={setPhoto}
        />

        <div className="form-dialog__row">
          <label className="login__field">
            <span>Nombre del escenario</span>
            <input
              autoComplete="off"
              maxLength={80}
              placeholder="Ej: Coliseo Mayor"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="login__field">
            <span>Está dentro de</span>
            <select
              value={parentId ?? ''}
              disabled={hasChildren}
              onChange={(e) => setParentId(e.target.value === '' ? null : Number(e.target.value))}
            >
              <option value="">Ninguno: es un escenario principal</option>
              {parents.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name} ({candidate.city}){candidate.active ? '' : ' · inactivo'}
                </option>
              ))}
            </select>
          </label>
        </div>
        {hasChildren && (
          <p className="field-hint">Tiene escenarios adentro: sigue siendo principal (solo hay un nivel).</p>
        )}

        {isMain ? (
          <div className="form-dialog__row">
            <label className="login__field">
              <span>Dirección</span>
              <input
                autoComplete="off"
                maxLength={150}
                placeholder="Ej: Calle 10 # 5-20"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>
            <label className="login__field">
              <span>Ciudad</span>
              <input
                autoComplete="off"
                maxLength={60}
                list={citiesId}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <datalist id={citiesId}>
                {cities.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>
          </div>
        ) : (
          <p className="form-dialog__note">
            Usa la dirección y la ciudad de {parent ? `"${parent.name}" (${parent.address}, ${parent.city})` : 'ese escenario'}.
          </p>
        )}

        <label className="login__field">
          <span>Descripción (opcional)</span>
          <textarea
            rows={3}
            maxLength={255}
            placeholder="Ej: Cubierto, con camerinos y parqueadero"
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
            {loading ? 'Guardando…' : 'Guardar escenario'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
