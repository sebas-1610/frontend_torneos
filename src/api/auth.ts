import { request } from './client'

// Lo que responde el backend al iniciar sesión (AuthResponseDTO).
export interface AuthResponse {
  accessToken: string | null // null si todavía falta el código 2FA
  tokenType: string | null
  expiresAt: string | null
  twoFactorRequired: boolean
  challengeId: string | null // solo viene cuando hay 2FA
}

// Paso 1 del login: correo y contraseña.
export function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

// Paso 2 (solo si hay 2FA): el código de 6 dígitos que llegó al correo.
export function verifyTwoFactor(challengeId: string, code: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/2fa/verify', {
    method: 'POST',
    body: JSON.stringify({ challengeId, code }),
  })
}

// Cerrar sesión: el backend invalida el token.
export function logout(): Promise<void> {
  return request<void>('/auth/logout', { method: 'POST' })
}
// Usuario que devuelve el backend (UserResponseDTO).
export interface User {
  id: number
  name: string
  email: string
  authProvider: 'LOCAL' | 'GOOGLE' | 'GITHUB' | 'MICROSOFT'
  enabled: boolean
  twoFactorEnabled: boolean
}

// Crear cuenta con correo y contraseña (HU-SE-07).
export function register(name: string, email: string, password: string): Promise<User> {
  return request<User>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
}

// Respuesta que solo trae un mensaje (MessageResponseDTO).
export interface MessageResponse {
  message: string
}

// Recuperar contraseña, paso 1: el backend envía un código de 6 dígitos al correo (HU-SE-09).
export function forgotPassword(email: string): Promise<MessageResponse> {
  return request<MessageResponse>('/auth/password/forgot', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

// Recuperar contraseña, paso 2: con el código se guarda la contraseña nueva.
export function resetPassword(email: string, code: string, newPassword: string): Promise<MessageResponse> {
  return request<MessageResponse>('/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify({ email, code, newPassword }),
  })
}

// Usuario dueño de la sesión actual (requiere token).
export function me(): Promise<User> {
  return request<User>('/auth/me')
}

// Activar o desactivar el 2FA de la propia cuenta. Pide la contraseña actual (HU-SE-10).
export function enableTwoFactor(password: string): Promise<User> {
  return request<User>('/auth/2fa/enable', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

export function disableTwoFactor(password: string): Promise<User> {
  return request<User>('/auth/2fa/disable', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}
