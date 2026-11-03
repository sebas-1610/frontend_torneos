import { request } from './client'

// Perfil de quien inició sesión: /api/auth/me/profile (HU-SE-02). Solo pide sesión, no un permiso:
// el backend toma el usuario del token, así cada persona maneja únicamente el suyo.

export interface Profile {
  id: number
  phone: string
  photo: string | null // URL de la fotografía
  birthDate: string | null // AAAA-MM-DD
  userId: number
}

export type ProfileInput = Omit<Profile, 'id' | 'userId'>

// Responde 404 mientras el usuario no haya registrado su perfil.
export function findMyProfile(): Promise<Profile> {
  return request<Profile>('/auth/me/profile')
}

export function createMyProfile(input: ProfileInput): Promise<Profile> {
  return request<Profile>('/auth/me/profile', { method: 'POST', body: JSON.stringify(input) })
}

// PUT reemplaza todo: si photo o birthDate van en null, quedan vacíos.
export function updateMyProfile(input: ProfileInput): Promise<Profile> {
  return request<Profile>('/auth/me/profile', { method: 'PUT', body: JSON.stringify(input) })
}

// Perfil de cualquier usuario: /api/users/{userId}/profile, ruta del administrador (permiso "perfiles").

export function findUserProfile(userId: number): Promise<Profile> {
  return request<Profile>(`/users/${userId}/profile`)
}

export function createUserProfile(userId: number, input: ProfileInput): Promise<Profile> {
  return request<Profile>(`/users/${userId}/profile`, { method: 'POST', body: JSON.stringify(input) })
}

export function updateUserProfile(userId: number, input: ProfileInput): Promise<Profile> {
  return request<Profile>(`/users/${userId}/profile`, { method: 'PUT', body: JSON.stringify(input) })
}

// Solo borra el perfil: el usuario y su acceso siguen igual.
export function deleteUserProfile(userId: number): Promise<void> {
  return request<void>(`/users/${userId}/profile`, { method: 'DELETE' })
}
