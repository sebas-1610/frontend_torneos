import { CircleAlert, CircleCheck, Info, LoaderCircle, RotateCcw, Save, UserRoundPlus, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import type { User } from '../../api/auth'
import { ApiError, errorMessage } from '../../api/client'
import { createMyProfile, findMyProfile, updateMyProfile, type Profile } from '../../api/profile'
import { initials } from '../../utils/initials'
import { ProfileFields } from './ProfileFields'
import { useProfileDraft } from './useProfileDraft'
import '../auth/LoginPage.css'
import './ProfilePage.css'

const PROVIDER_LABELS: Record<User['authProvider'], string> = {
  LOCAL: 'Correo y contraseña',
  GOOGLE: 'Google',
  GITHUB: 'GitHub',
  MICROSOFT: 'Microsoft',
}

interface ProfilePageProps {
  user: User | null // null mientras llega /api/auth/me
  onPhotoChange: (photo: string | null) => void // al guardar, el avatar del encabezado se actualiza
}

// Pantalla "Mi perfil" (HU-SE-02): teléfono, fotografía y fecha de nacimiento de quien inició sesión.
// No toca el nombre, el correo ni la contraseña: eso es información de autenticación.
export function ProfilePage({ user, onPhotoChange }: ProfilePageProps) {
  const draft = useProfileDraft()
  const { fill } = draft
  // null: todavía no tiene perfil (el backend respondió 404).
  const [saved, setSaved] = useState<Profile | null>(null)
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
        fill(found)
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
  }, [reloadKey, fill])

  const { input } = draft
  const dirty = draft.differsFrom(saved)
  const canSubmit = draft.valid && dirty && !saving
  const previewPhoto = input.photo && draft.photoOk && input.photo !== failedPhoto ? input.photo : null
  const photoFailed = draft.photoOk && input.photo !== null && input.photo === failedPhoto

  function handleReload() {
    setLoading(true)
    setLoadError(null)
    setReloadKey((key) => key + 1)
  }

  function handleDiscard() {
    fill(saved)
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
      fill(result)
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
              <ProfileFields draft={draft} photoFailed={photoFailed} />

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
