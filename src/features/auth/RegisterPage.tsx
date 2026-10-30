import { useState, type FormEvent } from 'react'
import { register } from '../../api/auth'
import { errorMessage } from '../../api/client'
import { ArcanosLogo } from '../../components/BrandIcons'
import { PasswordRuleList } from './PasswordRuleList'
import { isStrongPassword } from './passwordRules'
import './LoginPage.css'

interface RegisterPageProps {
  onRegistered: (email: string) => void // cuenta creada: volvemos al login con el correo listo
  onBack: () => void
}

// Registro con correo y contraseña (HU-SE-07).
export function RegisterPage({ onRegistered, onBack }: RegisterPageProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const passwordOk = isStrongPassword(password)
  const confirmOk = confirm.length > 0 && confirm === password
  const canSubmit = name.trim().length >= 2 && email.trim() !== '' && passwordOk && confirmOk

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const user = await register(name.trim(), email.trim(), password)
      onRegistered(user.email)
    } catch (err) {
      setError(errorMessage(err)) // ej: "Ya existe una cuenta registrada con este correo"
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login">
      <form className="login__card panel" onSubmit={handleSubmit} noValidate>
        <div className="login__brand">
          <ArcanosLogo size={80} />
          <h1 className="login__title">Crear cuenta</h1>
          <p className="login__subtitle">Regístrate con tu correo y una contraseña</p>
        </div>

        <label className="login__field">
          <span>Nombre</span>
          <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="login__field">
          <span>Correo electrónico</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label className="login__field">
          <span>Contraseña</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <PasswordRuleList password={password} />

        <label className="login__field">
          <span>Confirmar contraseña</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        {confirm.length > 0 && !confirmOk && <p className="login__hint">Las contraseñas no coinciden.</p>}

        {error && (
          <p className="login__error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="button button--primary login__submit" disabled={loading || !canSubmit}>
          {loading ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>

        <p className="login__switch">
          ¿Ya tienes cuenta?{' '}
          <button type="button" className="login__link" onClick={onBack}>
            Inicia sesión
          </button>
        </p>
      </form>
    </div>
  )
}
