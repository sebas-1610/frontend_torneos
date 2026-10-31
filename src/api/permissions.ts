import { request } from './client'
import type { ModuleType, Operation } from './security'

// Rutas de /api/permissions (ms_torneos_security).

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface Endpoint {
  url: string // ej: /api/users/{id}
  method: HttpMethod
}

export interface Permission {
  id: number
  module: ModuleType
  model: string // recurso en minúsculas, ej: usuarios, asignacion-roles
  operation: Operation
  endpoints: Endpoint[]
}

// Lo mismo que se envía al crear y al editar (PUT reemplaza todo, endpoints incluidos).
export type PermissionInput = Omit<Permission, 'id'>

export function findPermissions(): Promise<Permission[]> {
  return request<Permission[]>('/permissions')
}

export function createPermission(input: PermissionInput): Promise<Permission> {
  return request<Permission>('/permissions', { method: 'POST', body: JSON.stringify(input) })
}

export function updatePermission(id: number, input: PermissionInput): Promise<Permission> {
  return request<Permission>(`/permissions/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

// Falla (el backend responde con el motivo) si el permiso está asignado a algún rol.
export function deletePermission(id: number): Promise<void> {
  return request<void>(`/permissions/${id}`, { method: 'DELETE' })
}
