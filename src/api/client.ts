// En desarrollo Vite redirige /api al backend (ver vite.config.ts). VITE_API_URL permite apuntar a otro host.
const API_URL = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.')
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response))
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

// El backend responde { errorCase, message } o, en errores de validación, { campo: mensaje }.
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object') {
      const record = body as Record<string, unknown>
      if (typeof record.message === 'string') {
        return record.message
      }
      const messages = Object.values(record).filter((value): value is string => typeof value === 'string')
      if (messages.length > 0) {
        return messages.join(' ')
      }
    }
  } catch {
    // Cuerpo vacío o no JSON: se usa el mensaje genérico.
  }
  if (response.status >= 500) {
    return `El servidor no respondió correctamente (HTTP ${response.status}). Verifica que el backend esté en ejecución.`
  }
  return `La solicitud falló (HTTP ${response.status}).`
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
}
