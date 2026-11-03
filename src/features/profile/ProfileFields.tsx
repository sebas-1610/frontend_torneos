import type { ProfileDraft } from './useProfileDraft'
import '../auth/LoginPage.css'
import './ProfilePage.css'

interface ProfileFieldsProps {
  draft: ProfileDraft
  photoFailed: boolean // la URL tiene buen formato pero la imagen no cargó
  disabled?: boolean // solo lectura (por ejemplo, sin permiso para cambiar perfiles)
}

// Teléfono, fotografía y fecha de nacimiento (HU-SE-02), con los avisos de cada regla.
export function ProfileFields({ draft, photoFailed, disabled = false }: ProfileFieldsProps) {
  return (
    <>
      <label className="login__field">
        <span>Teléfono</span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+573001234567"
          value={draft.phone}
          disabled={disabled}
          onChange={(e) => draft.setPhone(e.target.value)}
        />
      </label>
      {draft.phone !== '' && !draft.phoneOk && (
        <p className="login__hint">Entre 7 y 15 dígitos, sin espacios; puede empezar por +.</p>
      )}

      <label className="login__field">
        <span>
          Fotografía <span className="profile-form__optional">(URL, opcional)</span>
        </span>
        <input
          type="url"
          inputMode="url"
          placeholder="https://…"
          value={draft.photo}
          disabled={disabled}
          onChange={(e) => draft.setPhoto(e.target.value)}
        />
      </label>
      {!draft.photoOk && <p className="login__hint">Debe ser una URL que empiece por http:// o https://.</p>}
      {photoFailed && <p className="profile-form__note">No se pudo cargar la imagen de esa URL; revisa que sea pública.</p>}

      <label className="login__field">
        <span>
          Fecha de nacimiento <span className="profile-form__optional">(opcional)</span>
        </span>
        <input
          type="date"
          max={draft.maxBirthDate}
          value={draft.birthDate}
          disabled={disabled}
          onChange={(e) => draft.setBirthDate(e.target.value)}
        />
      </label>
      {!draft.birthDateOk && <p className="login__hint">La fecha de nacimiento debe ser anterior a hoy.</p>}
    </>
  )
}
