import type { User } from './auth'
import { request } from './client'

// Rutas de /api/users (ms_torneos_security). La respuesta tiene la misma forma que /api/auth/me,
// por eso se reutiliza el tipo User.

export interface UserInput {
  name: string
  email: string
  // Al editar es opcional: si no se envía, el backend conserva la contraseña actual.
  password?: string
}

export function findUsers(): Promise<User[]> {
  return request<User[]>('/users')
}

export function createUser(input: UserInput): Promise<User> {
  return request<User>('/users', { method: 'POST', body: JSON.stringify(input) })
}

// PUT reemplaza nombre y correo: siempre hay que enviarlos aunque no cambien.
export function updateUser(id: number, input: UserInput): Promise<User> {
  return request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

// Desactivar cierra todas las sesiones del usuario: su próxima petición recibe 401.
export function disableUser(id: number): Promise<User> {
  return request<User>(`/users/${id}/disable`, { method: 'PATCH' })
}

export function enableUser(id: number): Promise<User> {
  return request<User>(`/users/${id}/enable`, { method: 'PATCH' })
}

// Borra en cascada su perfil, sus roles asignados y sus sesiones.
export function deleteUser(id: number): Promise<void> {
  return request<void>(`/users/${id}`, { method: 'DELETE' })
}
