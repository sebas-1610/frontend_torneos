import type { User } from './auth'
import { request } from './client'
import type { Role } from './security'

// Crear, editar y eliminar roles (/api/roles) y manejar qué usuarios tiene cada uno (/api/user-roles).
// Listar roles y la matriz de permisos siguen en security.ts.

export interface RoleInput {
  name: string // 3 a 50 caracteres
  description: string // obligatoria, máximo 255
}

// GET /api/user-roles/roles/{roleId} trae el usuario completo, no solo su id.
export interface RoleMember {
  id: number
  roleId: number
  user: User
}

export function createRole(input: RoleInput): Promise<Role> {
  return request<Role>('/roles', { method: 'POST', body: JSON.stringify(input) })
}

// PUT reemplaza nombre y descripción: siempre hay que enviar los dos.
export function updateRole(id: number, input: RoleInput): Promise<Role> {
  return request<Role>(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

// Falla si el rol tiene usuarios. Si no, borra también sus permisos asignados.
export function deleteRole(id: number): Promise<void> {
  return request<void>(`/roles/${id}`, { method: 'DELETE' })
}

export function findRoleMembers(roleId: number): Promise<RoleMember[]> {
  return request<RoleMember[]>(`/user-roles/roles/${roleId}`)
}

// Usuarios que todavía no tienen este rol (los que se pueden agregar).
export function findAvailableUsers(roleId: number): Promise<User[]> {
  return request<User[]>(`/user-roles/roles/${roleId}/available-users`)
}

export function assignRole(userId: number, roleId: number): Promise<void> {
  return request<void>('/user-roles', { method: 'POST', body: JSON.stringify({ userId, roleId }) })
}

export function removeRole(userId: number, roleId: number): Promise<void> {
  return request<void>(`/user-roles/${userId}/${roleId}`, { method: 'DELETE' })
}
