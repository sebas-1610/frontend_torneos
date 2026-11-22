import {
  Armchair,
  Box,
  Building2,
  ChartColumn,
  ChartNoAxesColumnIncreasing,
  ClipboardCheck,
  ClipboardList,
  Coins,
  CreditCard,
  Goal,
  Grid2x2,
  Layers,
  Handshake,
  Heart,
  IdCard,
  KeyRound,
  Link2,
  ListChecks,
  MapPinned,
  Network,
  Percent,
  ReceiptText,
  Shield,
  Shirt,
  Sparkles,
  Star,
  Store,
  Ticket,
  TicketCheck,
  Tickets,
  Trophy,
  UserCog,
  UserRound,
  UserRoundCheck,
  UsersRound,
  Users,
  Wallet,
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
  GESTION_COMPETENCIAS: 'Gestión de Competencias',
  GESTION_ESCENARIOS: 'Gestión de Escenarios',
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
  // Desarrollo de un torneo (HU-GC-08): sus fases y llaves.
  ['desarrollo-torneo', Network],
  // Los equipos de interés del aficionado (HU-GE-05) antes que el equipo: también empiezan por "equipo".
  ['equipos-interes', Heart],
  // Los mismos iconos del menú.
  ['equipo', Shield],
  ['team', Shield],
  ['jugador', Shirt],
  ['player', Shirt],
  ['partido', SoccerBallIcon],
  ['match', SoccerBallIcon],
  ['entrada', Ticket],
  ['ticket', Ticket],
  // Los escenarios de un torneo (HU-GE-02) antes que el escenario: también empiezan por "escenario".
  ['escenarios-torneo', MapPinned],
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
  // Gestión de Competencias (Anexo 3). Torneos ya tiene el trofeo de arriba.
  ['inscripcion', ClipboardList],
  ['fase', Layers],
  ['asignacion-grupo', Users],
  ['grupo', Grid2x2],
  ['resultado', ClipboardCheck],
  ['anotacion', Goal],
  // Los del aficionado antes que el catálogo: "metodos-pago-aficionado" también empieza por "metodos-pago".
  ['metodos-pago-aficionado', Wallet],
  ['metodos-pago', CreditCard],
  // Las del administrador antes que las del aficionado: "apuestas-partido" también empieza por "apuesta".
  ['apuestas-partido', ReceiptText],
  ['apuesta', Coins],
  ['cuota', Percent],
  // Gestión de Escenarios (Anexo 4). Escenarios ya tiene el edificio de arriba.
  ['localidad', Armchair],
  ['venta-entradas', Store],
  // Los del administrador antes que los del aficionado: "boletos-partido" también empieza por "boleto".
  ['boletos-partido', Tickets],
  ['boleto', TicketCheck],
  ['aficionados-equipo', UsersRound],
]

// Nombres que no salen bien de solo quitar los guiones: el model se guarda sin tildes.
const RESOURCE_LABELS = new Map([
  ['asignacion-roles', 'Asignación de roles'],
  ['asignacion-permisos', 'Asignación de permisos'],
  ['asignacion-deportes', 'Asignación de deportes'],
  ['asignacion-habilidades', 'Asignación de habilidades'],
  ['asignacion-grupos', 'Asignación de grupos'],
  ['desarrollo-torneos', 'Desarrollo de torneos'],
  ['metodos-pago', 'Métodos de pago'],
  ['metodos-pago-aficionado', 'Métodos de pago del aficionado'],
  ['apuestas-partido', 'Apuestas por partido'],
  ['escenarios-torneo', 'Escenarios del torneo'],
  ['venta-entradas', 'Venta de entradas'],
  ['boletos-partido', 'Boletos por partido'],
  ['equipos-interes', 'Equipos de interés'],
  ['aficionados-equipo', 'Aficionados del equipo'],
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
