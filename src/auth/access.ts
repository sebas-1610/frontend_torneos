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
  // Gestión Deportiva (Anexo 2): protegen las rutas /api/deportiva/... de ms_torneos_deportiva.
  sports: 'deportes',
  teams: 'equipos',
  teamSports: 'asignacion-deportes',
  players: 'jugadores',
  contracts: 'contratos',
  skills: 'habilidades',
  playerSkills: 'asignacion-habilidades',
  sportsProfile: 'perfil-deportivo',
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
    case 'deportes':
      return can(RESOURCES.sports, 'LIST')
    case 'equipos':
      return can(RESOURCES.teams, 'LIST')
    case 'equipos-deportes':
      // Carga los equipos (con sus deportes) y el catálogo de deportes.
      return can(RESOURCES.teams, 'LIST') && can(RESOURCES.sports, 'LIST') && can(RESOURCES.teamSports, 'LIST')
    case 'equipos-plantilla':
      // Carga los equipos y los contratos del elegido. Sin "listar jugadores" se ve, pero sin fotos.
      return can(RESOURCES.teams, 'LIST') && can(RESOURCES.contracts, 'LIST')
    case 'jugadores':
      return can(RESOURCES.players, 'LIST')
    case 'habilidades':
      return can(RESOURCES.skills, 'LIST')
    case 'perfil-deportivo':
      // Carga los jugadores para buscar y el perfil del elegido.
      return can(RESOURCES.players, 'LIST') && can(RESOURCES.sportsProfile, 'VIEW')
    case 'habilidades-jugadores':
      // Carga los jugadores, el catálogo y las habilidades del jugador elegido.
      return can(RESOURCES.players, 'LIST') && can(RESOURCES.skills, 'LIST') && can(RESOURCES.playerSkills, 'LIST')
    default:
      return true // perfil: cualquier usuario con sesión
  }
}

// En orden: el Administrador entra a Roles; el Administrador deportivo, a Deportes.
const START_PAGES = [
  'roles',
  'usuarios',
  'permisos',
  'deportes',
  'equipos',
  'jugadores',
  'habilidades',
  'perfil-deportivo',
] as const

// Pantalla al entrar sin una en la URL: la primera que puede usar; sin permisos, su perfil.
export function defaultPage(can: Can): (typeof START_PAGES)[number] | 'perfil' {
  return START_PAGES.find((page) => canOpenPage(page, can)) ?? 'perfil'
}
