import { useState, type FormEvent } from 'react'
import { verifyTwoFactor, type AuthResponse } from '../../api/auth'
import { errorMessage } from '../../api/client'

interface TwoFactorFormProps {
  challengeId: string // lo devolvió el login: dice qué inicio de sesión estamos completando
  onVerified: (response: AuthResponse) => void // código correcto: LoginPage guarda la sesión
  onCancel: () => void // volver al formulario de correo y contraseña
}

// Segundo paso del login cuando la cuenta tiene 2FA (HU-SE-10).
export function TwoFactorForm({ challengeId, onVerified, onCancel }: TwoFactorFormProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const response = await verifyTwoFactor(challengeId, code)
      onVerified(response)
    } catch (err) {
      setError(errorMessage(err)) // ej: código incorrecto o expirado
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="login__card panel" onSubmit={handleSubmit} noValidate>
      <div className="login__brand">
        <h1 className="login__title">Verificación en dos pasos</h1>
        <p className="login__subtitle">Escribe el código de 6 dígitos que enviamos a tu correo</p>
      </div>

      <label className="login__field">
        <span>Código de verificación</span>
        <input
          className="login__code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          // Solo dejamos escribir números.
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          autoFocus
        />
      </label>

      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="button button--primary login__submit"
        disabled={loading || code.length !== 6}
      >
        {loading ? 'Verificando…' : 'Verificar'}
      </button>

      <button type="button" className="button button--text" onClick={onCancel} disabled={loading}>
        Volver
      </button>
    </form>
  )
}
