import { useState, type FormEvent } from 'react'
import { forgotPassword, resetPassword } from '../../api/auth'
import { errorMessage } from '../../api/client'
import { ArcanosLogo } from '../../components/BrandIcons'
import { PasswordRuleList } from './PasswordRuleList'
import { isStrongPassword } from './passwordRules'
import './LoginPage.css'

interface ForgotPasswordPageProps {
  initialEmail?: string
  onDone: (email: string, message: string) => void // contraseña cambiada: volvemos al login
  onBack: () => void
}

// Recuperar contraseña en dos pasos (HU-SE-09):
//   1. "email": pedimos el correo y el backend envía un código.
//   2. "reset": con ese código se escribe la contraseña nueva.
export function ForgotPasswordPage({ initialEmail = '', onDone, onBack }: ForgotPasswordPageProps) {
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [info, setInfo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const confirmOk = confirm.length > 0 && confirm === password
  const canReset = code.length === 6 && isStrongPassword(password) && confirmOk

  async function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const response = await forgotPassword(email.trim())
      // El backend responde lo mismo exista o no el correo, para no revelar qué cuentas hay.
      setInfo(response.message)
      setStep('reset')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const response = await resetPassword(email.trim(), code, password)
      onDone(email.trim(), response.message)
    } catch (err) {
      setError(errorMessage(err)) // ej: "El código expiró: solicita uno nuevo"
    } finally {
      setLoading(false)
    }
  }

  const header = (
    <div className="login__brand">
      <ArcanosLogo size={80} />
      <h1 className="login__title">Recuperar contraseña</h1>
      <p className="login__subtitle">
        {step === 'email'
          ? 'Te enviaremos un código a tu correo'
          : 'Escribe el código que te llegó y tu contraseña nueva'}
      </p>
    </div>
  )

  const errorBox = error && (
    <p className="login__error" role="alert">
      {error}
    </p>
  )

  const backLink = (
    <p className="login__switch">
      <button type="button" className="login__link" onClick={onBack}>
        Volver a iniciar sesión
      </button>
    </p>
  )

  if (step === 'email') {
    return (
      <div className="login">
        <form className="login__card panel" onSubmit={handleSendCode} noValidate>
          {header}
          <label className="login__field">
            <span>Correo electrónico</span>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {errorBox}
          <button type="submit" className="button button--primary login__submit" disabled={loading || !email.trim()}>
            {loading ? 'Enviando…' : 'Enviar código'}
          </button>
          <p className="login__switch">
            Si entras con Google, GitHub o Microsoft, recupera tu acceso con ese proveedor.
          </p>
          {backLink}
        </form>
      </div>
    )
  }

  return (
    <div className="login">
      <form className="login__card panel" onSubmit={handleReset} noValidate>
        {header}
        {info && !error && <p className="login__notice">{info}</p>}

        <label className="login__field">
          <span>Código de 6 dígitos</span>
          <input
            className="login__code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
        </label>

        <label className="login__field">
          <span>Contraseña nueva</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <PasswordRuleList password={password} />

        <label className="login__field">
          <span>Confirmar contraseña nueva</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        {confirm.length > 0 && !confirmOk && <p className="login__hint">Las contraseñas no coinciden.</p>}

        {errorBox}

        <button type="submit" className="button button--primary login__submit" disabled={loading || !canReset}>
          {loading ? 'Guardando…' : 'Cambiar contraseña'}
        </button>

        <p className="login__switch">
          ¿No te llegó el código?{' '}
          <button
            type="button"
            className="login__link"
            onClick={() => {
              setStep('email')
              setCode('')
              setError(null)
            }}
          >
            Pedir otro
          </button>
        </p>
        {backLink}
      </form>
    </div>
  )
}
