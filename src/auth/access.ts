import { createContext, useContext } from 'react'
import type { PermissionSummary } from '../api/auth'
import type { Operation } from '../api/security'

// Recursos (model) que DatabaseSeeder registra en ms_torneos_security. El menú y los botones
// se muestran según los permisos que /api/auth/me devuelve para estos recursos (HU-SE-08).
// Ocultar es solo visual: el backend igual valida cada petición y responde 403 si falta el permiso.
export const RESOURCES = {
  users: 'usuarios',
  profiles: 'perfiles',
  roles: 'roles',
  permissions: 'permisos',
  userRoles: 'asignacion-roles',
  rolePermissions: 'asignacion-permisos',
} as const

// Rol que el backend protege (AdminGuard): no se renombra y nadie se lo quita a sí mismo.
// Quitarle permisos sí se puede, pero la matriz advierte antes de guardar.
export const ADMIN_ROLE = 'Administrador'

export function isAdminRole(name: string): boolean {
  return name.toLowerCase() === ADMIN_ROLE.toLowerCase()
}

export type Can = (model: string, operation: Operation) => boolean

export function makeCan(permissions: PermissionSummary[]): Can {
  const granted = new Set(permissions.map((permission) => `${permission.model}:${permission.operation}`))
  return (model, operation) => granted.has(`${model}:${operation}`)
}

export interface Access {
  can: Can
  userId: number | null // usuario de la sesión, para avisar cuando una acción lo afecta a él mismo
}

export const AccessContext = createContext<Access>({ can: () => false, userId: null })

export function useAccess(): Access {
  return useContext(AccessContext)
}

// Permiso que pide cada pantalla: el mismo que exige el backend para la petición con la que carga.
export function canOpenPage(page: string, can: Can): boolean {
  switch (page) {
    case 'usuarios':
      return can(RESOURCES.users, 'LIST')
    case 'roles':
      return can(RESOURCES.roles, 'LIST')
    case 'roles-permisos':
      return can(RESOURCES.roles, 'LIST') && can(RESOURCES.rolePermissions, 'VIEW')
    case 'permisos':
      return can(RESOURCES.permissions, 'LIST')
    default:
      return true // perfil: cualquier usuario con sesión
  }
}

const START_PAGES = ['roles', 'usuarios', 'permisos'] as const

// Pantalla al entrar sin una en la URL: la primera que puede usar; sin permisos, su perfil.
export function defaultPage(can: Can): (typeof START_PAGES)[number] | 'perfil' {
  return START_PAGES.find((page) => canOpenPage(page, can)) ?? 'perfil'
}
