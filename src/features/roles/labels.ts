import {
  Box,
  Building2,
  ChartColumn,
  ChartNoAxesColumnIncreasing,
  Handshake,
  IdCard,
  KeyRound,
  Link2,
  ListChecks,
  Shield,
  Shirt,
  Sparkles,
  Star,
  Ticket,
  Trophy,
  UserCog,
  UserRound,
  UserRoundCheck,
  type LucideIcon,
} from 'lucide-react'
import type { ModuleType, Operation, Role } from '../../api/security'
import { SoccerBallIcon } from '../../components/BrandIcons'
import { IDENTITY_HUES } from '../../utils/hue'

// Cada rol tiene un tono pálido propio, según su posición en la lista de roles.
export function roleHue(roles: Role[], roleId: number | null): number {
  const index = Math.max(0, roles.findIndex((role) => role.id === roleId))
  return IDENTITY_HUES[index % IDENTITY_HUES.length]
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
// Gana la primera raíz que coincide, así que una raíz larga va antes que la corta que la contiene
// ("perfil-deportivo" antes que "perfil").
const RESOURCE_ICONS: [string, IconComponent][] = [
  ['usuario', UserRound],
  ['user', UserRound],
  ['perfil-deportivo', ChartNoAxesColumnIncreasing],
  ['perfil', IdCard],
  ['profile', IdCard],
  ['rol', UserCog],
  ['permis', KeyRound],
  // Las asignaciones unen usuario con rol y rol con permisos (la matriz de casillas).
  ['asignacion-rol', UserRoundCheck],
  ['asignacion-permis', ListChecks],
  ['torneo', Trophy],
  ['tournament', Trophy],
  // Los mismos iconos del menú.
  ['equipo', Shield],
  ['team', Shield],
  ['jugador', Shirt],
  ['player', Shirt],
  ['partido', SoccerBallIcon],
  ['match', SoccerBallIcon],
  ['entrada', Ticket],
  ['ticket', Ticket],
  ['escenario', Building2],
  ['venue', Building2],
  ['reporte', ChartColumn],
  ['report', ChartColumn],
  // Gestión Deportiva (Anexo 2).
  ['deporte', SoccerBallIcon],
  ['asignacion-deporte', Link2],
  ['contrato', Handshake],
  ['habilidad', Star],
  ['asignacion-habilidad', Sparkles],
]

// Nombres que no salen bien de solo quitar los guiones: el model se guarda sin tildes.
const RESOURCE_LABELS = new Map([
  ['asignacion-roles', 'Asignación de roles'],
  ['asignacion-permisos', 'Asignación de permisos'],
  ['asignacion-deportes', 'Asignación de deportes'],
  ['asignacion-habilidades', 'Asignación de habilidades'],
])

// Sin tildes ni mayúsculas, para comparar textos ("Asignación" y "asignacion" son lo mismo).
export function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function resourceIcon(model: string): IconComponent {
  const key = normalize(model)
  return RESOURCE_ICONS.find(([root]) => key.startsWith(root))?.[1] ?? Box
}

export function resourceLabel(model: string): string {
  const known = RESOURCE_LABELS.get(normalize(model))
  if (known) return known
  const text = model.replace(/[_-]+/g, ' ').trim()
  return text.charAt(0).toUpperCase() + text.slice(1)
}
