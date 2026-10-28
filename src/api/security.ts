import { request } from './client'

// Tipos espejo de los DTO de ms_torneos_security.

export type Operation = 'VIEW' | 'LIST' | 'CREATE' | 'UPDATE' | 'DELETE'

export type ModuleType =
  | 'ADMINISTRACION'
  | 'GESTION_DEPORTIVA'
  | 'COMERCIAL'
  | 'INFRAESTRUCTURA'
  | 'REPORTES'

export interface Role {
  id: number
  name: string
  description: string
}

export interface PermissionMatrixCell {
  operation: Operation
  // null cuando el permiso no está registrado para el recurso.
  permissionId: number | null
  assigned: boolean
}

export interface PermissionMatrixRow {
  model: string
  operations: PermissionMatrixCell[]
}

export interface PermissionMatrixModule {
  module: ModuleType
  resources: PermissionMatrixRow[]
}

export interface PermissionMatrix {
  roleId: number
  roleName: string
  modules: PermissionMatrixModule[]
}

export interface RoleUser {
  id: number
  roleId: number
  user: { id: number }
}

export function findRoles(): Promise<Role[]> {
  return request<Role[]>('/roles')
}

export function findPermissionMatrix(roleId: number): Promise<PermissionMatrix> {
  return request<PermissionMatrix>(`/role-permissions/roles/${roleId}/matrix`)
}

export function updatePermissionMatrix(roleId: number, permissionIds: number[]): Promise<PermissionMatrix> {
  return request<PermissionMatrix>(`/role-permissions/roles/${roleId}/matrix`, {
    method: 'PUT',
    body: JSON.stringify({ permissionIds }),
  })
}

export function findUsersByRole(roleId: number): Promise<RoleUser[]> {
  return request<RoleUser[]>(`/user-roles/roles/${roleId}`)
}
