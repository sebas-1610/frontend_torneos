// Sesión guardada en el navegador después de iniciar sesión.
export interface Session {
  accessToken: string
  tokenType: string // normalmente "Bearer"
  expiresAt: string
}

const STORAGE_KEY = 'sportmanager.session'

// Lo máximo que acepta setTimeout (unos 24 días); la sesión dura mucho menos.
const MAX_TIMER_DELAY = 2_147_483_647

export function saveSession(session: Session): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.accessToken === 'string' &&
    typeof record.tokenType === 'string' &&
    typeof record.expiresAt === 'string' &&
    !Number.isNaN(new Date(record.expiresAt).getTime())
  )
}

// Lo guardado puede no ser una sesión (editado a mano, de una versión anterior): se descarta
// en vez de dejar que JSON.parse tumbe la aplicación.
function readSession(): Session | null {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return null
  try {
    const value: unknown = JSON.parse(saved)
    if (isSession(value)) return value
  } catch {
    // No es JSON válido.
  }
  clearSession()
  return null
}

// Devuelve la sesión si existe y no ha expirado. Si expiró, la borra.
export function getSession(): Session | null {
  const session = readSession()
  if (!session) return null

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

// Cierra la sesión a la hora exacta en que vence (expiresAt), sin esperar a la siguiente petición.
// Al sonar vuelve a leer la sesión: si en otra pestaña se inició una nueva, espera a que venza esa.
// Devuelve la función que cancela la espera.
export function watchSessionExpiry(): () => void {
  let timer: number | undefined
  function check() {
    const session = getSession() // si ya venció, la borra y avisa
    if (!session) return
    const remaining = new Date(session.expiresAt).getTime() - Date.now()
    timer = window.setTimeout(check, Math.min(remaining, MAX_TIMER_DELAY))
  }
  check()
  return () => window.clearTimeout(timer)
}
