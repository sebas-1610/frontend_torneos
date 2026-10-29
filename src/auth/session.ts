// Sesión guardada en el navegador después de iniciar sesión.
export interface Session {
  accessToken: string
  tokenType: string // normalmente "Bearer"
  expiresAt: string
}

const STORAGE_KEY = 'sportmanager.session'

export function saveSession(session: Session): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

// Devuelve la sesión si existe y no ha expirado. Si expiró, la borra.
export function getSession(): Session | null {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return null

  const session = JSON.parse(saved) as Session
  if (new Date(session.expiresAt) <= new Date()) {
    expireSession()
    return null
  }
  return session
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY)
}
// Aviso para App.tsx: la sesión venció o el backend ya no acepta el token (HU-SE-08).
export const SESSION_EXPIRED_EVENT = 'sportmanager:session-expired'

export function expireSession(): void {
  clearSession()
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}
