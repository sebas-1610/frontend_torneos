import { useState, type FormEvent, type ReactNode } from 'react'
import { login, type AuthResponse } from '../../api/auth'
import { errorMessage } from '../../api/client'
import { startOAuthLogin, type OAuthProvider } from '../../auth/oauth'
import { saveSession } from '../../auth/session'
import { GitHubIcon, GoogleIcon, MicrosoftIcon, SportManagerLogo } from '../../components/BrandIcons'
import { TwoFactorForm } from './TwoFactorForm'
import './LoginPage.css'

// Botones de proveedores externos (HU-SE-08).
const PROVIDERS: { id: OAuthProvider; label: string; icon: ReactNode }[] = [
  { id: 'google', label: 'Continuar con Google', icon: <GoogleIcon /> },
  { id: 'github', label: 'Continuar con GitHub', icon: <GitHubIcon /> },
  { id: 'microsoft', label: 'Continuar con Microsoft', icon: <MicrosoftIcon /> },
]

interface LoginPageProps {
  onLoggedIn: () => void // App.tsx nos dice qué hacer cuando el login sale bien
  initialError?: string | null // error que trajo el login con proveedor, si falló
  notice?: string | null // aviso verde, por ejemplo después de crear la cuenta
  initialEmail?: string
  onCreateAccount: () => void // ir a la pantalla de registro
  onForgotPassword: (email: string) => void // ir a "Recuperar contraseña"
}

export function LoginPage({
  onLoggedIn,
  initialError = null,
  notice = null,
  initialEmail = '',
  onCreateAccount,
  onForgotPassword,
}: LoginPageProps) {
  // "Memoria" de la pantalla: lo que escribe el usuario y el estado del envío.
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(initialError)
  const [loading, setLoading] = useState(false)
  const [challengeId, setChallengeId] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault() // evita que el navegador recargue la página
    setError(null)
    setLoading(true)
    try {
      const response = await login(email.trim(), password)
      if (response.twoFactorRequired && response.challengeId) {
        setChallengeId(response.challengeId) // falta el código 2FA
      } else {
        startSession(response)
      }
    } catch (err) {
      setError(errorMessage(err)) // ej: "Credenciales inválidas"
    } finally {
      setLoading(false)
    }
  }

  function startSession(response: AuthResponse) {
    if (!response.accessToken || !response.tokenType || !response.expiresAt) {
      setError('El servidor no devolvió un token válido.')
      return
    }
    saveSession({
      accessToken: response.accessToken,
      tokenType: response.tokenType,
      expiresAt: response.expiresAt,
    })
    onLoggedIn()
  }

  // La cuenta tiene 2FA: en vez del formulario de correo mostramos el del código.
  if (challengeId) {
    return (
      <div className="login">
        <TwoFactorForm
          challengeId={challengeId}
          onVerified={startSession}
          onCancel={() => {
            // Cancelar no da acceso (HU-SE-10): volvemos a pedir correo y contraseña.
            setChallengeId(null)
            setPassword('')
          }}
        />
      </div>
    )
  }

  return (
    <div className="login">
      <form className="login__card panel" onSubmit={handleSubmit} noValidate>
        <div className="login__brand">
          <SportManagerLogo size={48} />
          <h1 className="login__title">Iniciar sesión</h1>
          <p className="login__subtitle">Ingresa con tu correo y contraseña</p>
        </div>

        {notice && !error && <p className="login__notice">{notice}</p>}

        <label className="login__field">
          <span>Correo electrónico</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="login__field">
          <span>Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button type="button" className="login__link login__forgot" onClick={() => onForgotPassword(email.trim())}>
          ¿Olvidaste tu contraseña?
        </button>

        {error && (
          <p className="login__error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="button button--primary login__submit"
          disabled={loading || !email || !password}
        >
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>

        <div className="login__divider">o continúa con</div>

        <div className="login__providers">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              className="button button--outline"
              onClick={() => startOAuthLogin(provider.id)}
            >
              {provider.icon}
              {provider.label}
            </button>
          ))}
        </div>

        <p className="login__switch">
          ¿No tienes cuenta?{' '}
          <button type="button" className="login__link" onClick={onCreateAccount}>
            Crear cuenta
          </button>
        </p>
      </form>
    </div>
  )
}
