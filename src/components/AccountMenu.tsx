import { useState, type FormEvent } from 'react'
import { disableTwoFactor, enableTwoFactor, type User } from '../api/auth'
import { errorMessage } from '../api/client'
import './AccountMenu.css'

const PROVIDER_LABELS: Record<User['authProvider'], string> = {
  LOCAL: 'correo y contraseña',
  GOOGLE: 'Google',
  GITHUB: 'GitHub',
  MICROSOFT: 'Microsoft',
}

interface AccountMenuProps {
  user: User
  onUserChange: (user: User) => void // el backend devuelve el usuario actualizado
}

// Menú "Mi cuenta": datos del usuario y verificación en dos pasos (HU-SE-10).
export function AccountMenu({ user, onUserChange }: AccountMenuProps) {
  const [askingPassword, setAskingPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isLocal = user.authProvider === 'LOCAL'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const updated = user.twoFactorEnabled ? await disableTwoFactor(password) : await enableTwoFactor(password)
      onUserChange(updated)
      setAskingPassword(false)
      setPassword('')
    } catch (err) {
      setError(errorMessage(err)) // ej: "La contraseña no es correcta"
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="account-menu" role="dialog" aria-label="Mi cuenta">
      <div>
        <div className="account-menu__name">{user.name}</div>
        <div className="account-menu__email">{user.email}</div>
        <div className="account-menu__provider">Inicias sesión con {PROVIDER_LABELS[user.authProvider]}</div>
      </div>

      <div className="account-menu__section">
        <div className="account-menu__row">
          <span className="account-menu__title">Verificación en dos pasos</span>
          {isLocal && (
            <span className={user.twoFactorEnabled ? 'pill pill--positive' : 'pill pill--neutral'}>
              {user.twoFactorEnabled ? 'Activada' : 'Desactivada'}
            </span>
          )}
        </div>

        {!isLocal ? (
          // Las cuentas OAuth no usan el 2FA de la plataforma: lo maneja el proveedor.
          <p className="account-menu__text">
            Tu cuenta usa {PROVIDER_LABELS[user.authProvider]}: la seguridad del acceso la maneja ese proveedor.
          </p>
        ) : !askingPassword ? (
          <>
            <p className="account-menu__text">
              {user.twoFactorEnabled
                ? 'Al iniciar sesión te pedimos un código que llega a tu correo.'
                : 'Agrega un código por correo al iniciar sesión para proteger tu cuenta.'}
            </p>
            <button type="button" className="button button--outline" onClick={() => setAskingPassword(true)}>
              {user.twoFactorEnabled ? 'Desactivar' : 'Activar'}
            </button>
          </>
        ) : (
          // Por seguridad, el backend pide la contraseña actual para cambiar el 2FA.
          <form className="account-menu__form" onSubmit={handleSubmit} noValidate>
            <label className="account-menu__field">
              <span>Confirma con tu contraseña</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </label>
            {error && (
              <p className="account-menu__error" role="alert">
                {error}
              </p>
            )}
            <div className="account-menu__actions">
              <button
                type="button"
                className="button button--text"
                onClick={() => {
                  setAskingPassword(false)
                  setPassword('')
                  setError(null)
                }}
                disabled={loading}
              >
                Cancelar
              </button>
              <button type="submit" className="button button--primary" disabled={loading || !password}>
                {loading ? 'Guardando…' : user.twoFactorEnabled ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
