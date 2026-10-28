import {
  Box,
  Building2,
  ChartColumn,
  KeyRound,
  Ticket,
  Trophy,
  UserCog,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { ModuleType, Operation, Role } from '../../api/security'
import { SoccerBallIcon } from '../../components/BrandIcons'

// Cada rol tiene un tono pálido propio (identidad, no dato): separados al menos 60° y lejos del violeta.
const ROLE_HUES = [40, 100, 160, 210, 340]

export function roleHue(roles: Role[], roleId: number | null): number {
  const index = Math.max(0, roles.findIndex((role) => role.id === roleId))
  return ROLE_HUES[index % ROLE_HUES.length]
}

export const OPERATIONS: { key: Operation; label: string }[] = [
  { key: 'VIEW', label: 'Ver' },
  { key: 'LIST', label: 'Listar' },
  { key: 'CREATE', label: 'Crear' },
  { key: 'UPDATE', label: 'Actualizar' },
  { key: 'DELETE', label: 'Eliminar' },
]

export const MODULE_LABELS: Record<ModuleType, string> = {
  ADMINISTRACION: 'Administración',
  GESTION_DEPORTIVA: 'Gestión Deportiva',
  COMERCIAL: 'Comercial',
  INFRAESTRUCTURA: 'Infraestructura',
  REPORTES: 'Reportes',
}

type IconComponent = LucideIcon | typeof SoccerBallIcon

// El backend guarda el recurso como texto libre (model); se reconoce por su raíz, sin tildes ni mayúsculas.
const RESOURCE_ICONS: [string, IconComponent][] = [
  ['usuario', UserRound],
  ['user', UserRound],
  ['rol', UserCog],
  ['permis', KeyRound],
  ['torneo', Trophy],
  ['tournament', Trophy],
  ['equipo', Users],
  ['team', Users],
  ['jugador', UserRound],
  ['player', UserRound],
  ['partido', SoccerBallIcon],
  ['match', SoccerBallIcon],
  ['entrada', Ticket],
  ['ticket', Ticket],
  ['escenario', Building2],
  ['venue', Building2],
  ['reporte', ChartColumn],
  ['report', ChartColumn],
]

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function resourceIcon(model: string): IconComponent {
  const key = normalize(model)
  return RESOURCE_ICONS.find(([root]) => key.startsWith(root))?.[1] ?? Box
}

export function resourceLabel(model: string): string {
  const text = model.replace(/[_-]+/g, ' ').trim()
  return text.charAt(0).toUpperCase() + text.slice(1)
}
