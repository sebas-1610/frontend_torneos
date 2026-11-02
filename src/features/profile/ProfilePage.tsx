import { CircleAlert, CircleCheck, Info, LoaderCircle, RotateCcw, Save, UserRoundPlus, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import type { User } from '../../api/auth'
import { ApiError, errorMessage } from '../../api/client'
import { createMyProfile, findMyProfile, updateMyProfile, type Profile, type ProfileInput } from '../../api/profile'
import '../auth/LoginPage.css'
import './ProfilePage.css'

// Mismas reglas que valida el backend (BaseProfileDTO).
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/
const PHOTO_PATTERN = /^https?:\/\/\S+$/

const PROVIDER_LABELS: Record<User['authProvider'], string> = {
  LOCAL: 'Correo y contraseña',
  GOOGLE: 'Google',
  GITHUB: 'GitHub',
  MICROSOFT: 'Microsoft',
}

// @Past del backend: la fecha de nacimiento debe ser anterior a hoy. Formato AAAA-MM-DD del <input type="date">.
function yesterday(): string {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

interface ProfilePageProps {
  user: User | null // null mientras llega /api/auth/me
  onPhotoChange: (photo: string | null) => void // al guardar, el avatar del encabezado se actualiza
}

// Pantalla "Mi perfil" (HU-SE-02): teléfono, fotografía y fecha de nacimiento de quien inició sesión.
// No toca el nombre, el correo ni la contraseña: eso es información de autenticación.
export function ProfilePage({ user, onPhotoChange }: ProfilePageProps) {
  // null: todavía no tiene perfil (el backend respondió 404).
  const [saved, setSaved] = useState<Profile | null>(null)
  const [phone, setPhone] = useState('')
  const [photo, setPhoto] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [maxBirthDate] = useState(yesterday)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  // URL de la foto que no se pudo mostrar: así la vista previa vuelve a las iniciales.
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    findMyProfile()
      .then((found) => {
        if (!active) return
        setSaved(found)
        setPhone(found.phone)
        setPhoto(found.photo ?? '')
        setBirthDate(found.birthDate ?? '')
      })
      .catch((err) => {
        if (!active) return
        // 404: todavía no tiene perfil; el formulario queda vacío para registrarlo.
        if (err instanceof ApiError && err.status === 404) setSaved(null)
        else setLoadError(errorMessage(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [reloadKey])

  const phoneOk = PHONE_PATTERN.test(phone.trim())
  const photoOk = photo.trim() === '' || (photo.trim().length <= 500 && PHOTO_PATTERN.test(photo.trim()))
  const birthDateOk = birthDate === '' || birthDate <= maxBirthDate
  const input: ProfileInput = { phone: phone.trim(), photo: photo.trim() || null, birthDate: birthDate || null }
  const dirty =
    saved === null ||
    input.phone !== saved.phone ||
    input.photo !== saved.photo ||
    input.birthDate !== saved.birthDate
  const canSubmit = phoneOk && photoOk && birthDateOk && dirty && !saving

  const previewPhoto = input.photo && photoOk && input.photo !== failedPhoto ? input.photo : null

  function handleReload() {
    setLoading(true)
    setLoadError(null)
    setReloadKey((key) => key + 1)
  }

  function handleDiscard() {
    setPhone(saved?.phone ?? '')
    setPhoto(saved?.photo ?? '')
    setBirthDate(saved?.birthDate ?? '')
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const result = saved ? await updateMyProfile(input) : await createMyProfile(input)
      setSaved(result)
      setPhone(result.phone)
      setPhoto(result.photo ?? '')
      setBirthDate(result.birthDate ?? '')
      onPhotoChange(result.photo)
      setNotice(saved ? 'Perfil actualizado correctamente.' : 'Perfil creado correctamente.')
    } catch (err) {
      setError(errorMessage(err)) // ej: "El teléfono debe tener entre 7 y 15 dígitos..."
    } finally {
      setSaving(false)
    }
  }

  let finding = 'Cargando tu perfil…'
  if (!loading && loadError) finding = 'No se pudo cargar tu perfil.'
  else if (!loading && saved === null) finding = 'Todavía no tienes perfil: regístralo con tu teléfono y, si quieres, tu foto y fecha de nacimiento.'
  else if (!loading) finding = 'Tus datos personales. Cambiarlos no afecta tu correo, tu contraseña ni tu forma de iniciar sesión.'

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">Mi perfil</h1>
        <p className="page__finding">{finding}</p>
      </div>

      <div className="page__grid">
        <section className="panel profile-panel" aria-labelledby="profile-title" aria-busy={loading}>
          <div className="profile-identity">
            <span className="profile-avatar" aria-hidden="true">
              {previewPhoto ? (
                <img src={previewPhoto} alt="" onError={() => setFailedPhoto(previewPhoto)} />
              ) : (
                initials(user?.name ?? '')
              )}
            </span>
            <div>
              <h2 id="profile-title" className="profile-identity__name">
                {user?.name ?? 'Mi perfil'}
              </h2>
              <p className="profile-identity__email">{user?.email ?? 'Cargando…'}</p>
            </div>
          </div>

          {loadError ? (
            <div className="inline-error" role="alert">
              <CircleAlert size={16} aria-hidden="true" />
              <span>{loadError}</span>
              <button type="button" className="text-action" onClick={handleReload}>
                Reintentar
              </button>
            </div>
          ) : loading ? (
            <p className="empty-state">Cargando tu perfil…</p>
          ) : (
            <form className="profile-form" onSubmit={handleSubmit} noValidate>
              <label className="login__field">
                <span>Teléfono</span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+573001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
              {phone !== '' && !phoneOk && (
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
                  value={photo}
                  onChange={(e) => setPhoto(e.target.value)}
                />
              </label>
              {!photoOk && <p className="login__hint">Debe ser una URL que empiece por http:// o https://.</p>}
              {photoOk && input.photo !== null && input.photo === failedPhoto && (
                <p className="profile-form__note">No se pudo cargar la imagen de esa URL; revisa que sea pública.</p>
              )}

              <label className="login__field">
                <span>
                  Fecha de nacimiento <span className="profile-form__optional">(opcional)</span>
                </span>
                <input type="date" max={maxBirthDate} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </label>
              {!birthDateOk && <p className="login__hint">La fecha de nacimiento debe ser anterior a hoy.</p>}

              {error && (
                <p className="login__error" role="alert">
                  {error}
                </p>
              )}

              <div className="profile-form__actions">
                {saved && (
                  <button type="button" className="button button--text" onClick={handleDiscard} disabled={saving || !dirty}>
                    <RotateCcw size={16} aria-hidden="true" />
                    Descartar cambios
                  </button>
                )}
                <button type="submit" className="button button--primary" disabled={!canSubmit}>
                  {saving ? (
                    <LoaderCircle size={16} aria-hidden="true" className="spin" />
                  ) : saved ? (
                    <Save size={16} aria-hidden="true" />
                  ) : (
                    <UserRoundPlus size={16} aria-hidden="true" />
                  )}
                  {saving ? 'Guardando…' : saved ? 'Guardar cambios' : 'Crear perfil'}
                </button>
              </div>
            </form>
          )}
        </section>

        <aside className="rail" aria-label="Datos de acceso">
          <section className="panel summary" aria-labelledby="account-title">
            <h2 id="account-title" className="panel__title">
              Tu cuenta
            </h2>
            <dl className="facts">
              <div>
                <dt>Nombre</dt>
                <dd className="facts__strong">{user?.name ?? '—'}</dd>
              </div>
              <div>
                <dt>Correo</dt>
                <dd className="profile-facts__email">{user?.email ?? '—'}</dd>
              </div>
              <div>
                <dt>Inicia sesión con</dt>
                <dd>{user ? PROVIDER_LABELS[user.authProvider] : '—'}</dd>
              </div>
              {user?.authProvider === 'LOCAL' && (
                <div>
                  <dt>Verificación en dos pasos</dt>
                  <dd>
                    <span className={`pill ${user.twoFactorEnabled ? 'pill--positive' : 'pill--neutral'}`}>
                      {user.twoFactorEnabled ? 'Activada' : 'Desactivada'}
                    </span>
                  </dd>
                </div>
              )}
            </dl>
            <p className="profile-note">
              <Info size={16} strokeWidth={1.8} aria-hidden="true" />
              Estos son tus datos de acceso: el perfil no los modifica. Para cambiar tu nombre o correo, pídeselo a
              un administrador.
            </p>
          </section>
        </aside>
      </div>

      <div className="toast-region" aria-live="polite">
        {notice && (
          <div className="toast" role="status">
            <CircleCheck size={18} aria-hidden="true" className="toast__icon" />
            <span>{notice}</span>
            <button type="button" className="icon-button icon-button--small" aria-label="Cerrar mensaje" onClick={() => setNotice(null)}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
