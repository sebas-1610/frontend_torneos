import { saveSession } from './session'

// El nombre debe coincidir con el registro del proveedor en el backend (/oauth2/authorization/{nombre}).
export type OAuthProvider = 'google' | 'github' | 'microsoft'

// El login con proveedor no pasa por el proxy /api de Vite: el navegador va directo al backend.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8181'

// Lleva al usuario a la página de Google, GitHub o Microsoft (HU-SE-08).
export function startOAuthLogin(provider: OAuthProvider): void {
  window.location.href = `${BACKEND_URL}/oauth2/authorization/${provider}`
}

// Al volver, el backend deja el resultado en el fragmento de la URL:
//   #accessToken=...&tokenType=Bearer&expiresAt=...   (salió bien)
//   #errorCase=...&message=...                         (salió mal)
// Se lee una sola vez; devuelve el mensaje de error, o null si no hubo error.
let oauthError: string | null | undefined

export function handleOAuthRedirect(): string | null {
  if (oauthError !== undefined) return oauthError
  oauthError = null

  const params = new URLSearchParams(window.location.hash.slice(1))
  const accessToken = params.get('accessToken')
  const tokenType = params.get('tokenType')
  const expiresAt = params.get('expiresAt')
  const message = params.get('message')

  if (accessToken && tokenType && expiresAt) {
    saveSession({ accessToken, tokenType, expiresAt })
  } else if (message) {
    oauthError = message
  } else {
    return null // la URL no trae nada del login con proveedor
  }

  // Quitamos el token de la barra de direcciones para que no quede a la vista.
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
  return oauthError
}
