import { useState } from 'react'
import { ImageField } from '../../components/ImageField'
import { photoFromFile } from '../../utils/image'
import { initials } from '../../utils/initials'
import type { ProfileDraft } from './useProfileDraft'
import '../auth/LoginPage.css'
import './ProfilePage.css'

interface ProfileFieldsProps {
  draft: ProfileDraft
  name: string // del usuario: sin foto se ven sus iniciales
  disabled?: boolean // mientras se guarda
  readOnly?: boolean // sin permiso para cambiar perfiles
}

// Fotografía, teléfono y fecha de nacimiento (HU-SE-02), con los avisos de cada regla.
export function ProfileFields({ draft, name, disabled = false, readOnly = false }: ProfileFieldsProps) {
  // Foto que no se pudo mostrar (una URL de antes, borrada o privada): se ven las iniciales.
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null)
  const { photo } = draft
  const photoFailed = photo !== null && photo === failedPhoto

  return (
    <>
      {/* La key lo reinicia al guardar o descartar, para que no quede un aviso viejo. */}
      <ImageField
        key={draft.fills}
        label={readOnly ? 'Foto' : 'Foto (opcional)'}
        hint="JPG, PNG o WEBP. Se recorta en cuadrado."
        preview={
          <span className="profile-avatar" aria-hidden="true">
            {photo && !photoFailed ? (
              <img src={photo} alt="" onError={() => setFailedPhoto(photo)} />
            ) : (
              initials(name)
            )}
          </span>
        }
        value={photo}
        read={photoFromFile}
        uploadLabel="Subir foto"
        changeLabel="Cambiar foto"
        inputLabel="Elegir foto de perfil"
        onChange={draft.setPhoto}
        droppable
        disabled={disabled}
        readOnly={readOnly}
      />
      {photoFailed && (
        <p className="profile-form__note">
          No se pudo cargar la foto guardada.{!readOnly && ' Sube otra o quítala.'}
        </p>
      )}

      <label className="login__field">
        <span>Teléfono</span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+573001234567"
          value={draft.phone}
          disabled={disabled || readOnly}
          onChange={(e) => draft.setPhone(e.target.value)}
        />
      </label>
      {draft.phone !== '' && !draft.phoneOk && (
        <p className="login__hint">Entre 7 y 15 dígitos, sin espacios; puede empezar por +.</p>
      )}

      <label className="login__field">
        <span>
          Fecha de nacimiento <span className="profile-form__optional">(opcional)</span>
        </span>
        <input
          type="date"
          max={draft.maxBirthDate}
          value={draft.birthDate}
          disabled={disabled || readOnly}
          onChange={(e) => draft.setBirthDate(e.target.value)}
        />
      </label>
      {!draft.birthDateOk && <p className="login__hint">La fecha de nacimiento debe ser anterior a hoy.</p>}
    </>
  )
}
