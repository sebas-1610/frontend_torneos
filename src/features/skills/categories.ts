import {
  BadgeCheck,
  BicepsFlexed,
  Brain,
  ChessKnight,
  CircleArrowUp,
  CircleDot,
  Crosshair,
  Crown,
  Dumbbell,
  Eye,
  Footprints,
  Hand,
  Handshake,
  HeartPulse,
  MapPin,
  MessageCircle,
  Mountain,
  Rabbit,
  Send,
  Shield,
  Target,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { Skill, SkillCategory } from '../../api/skills'
import { normalize } from '../roles/labels'

// Categorías de habilidad, en el orden en que se agrupa el catálogo. Cada una tiene su color de
// identidad (--tone-* de index.css): lo llevan los iconos de sus habilidades, nada más.
export const CATEGORIES: { key: SkillCategory; label: string; icon: LucideIcon; tone: string }[] = [
  { key: 'FISICA', label: 'Física', icon: Dumbbell, tone: '--tone-orange' },
  { key: 'TECNICA', label: 'Técnica', icon: Target, tone: '--tone-blue' },
  { key: 'TACTICA', label: 'Táctica', icon: ChessKnight, tone: '--tone-green' },
  { key: 'MENTAL', label: 'Mental', icon: Brain, tone: '--tone-purple' },
]

export function categoryOf(key: SkillCategory): (typeof CATEGORIES)[number] {
  return CATEGORIES.find((category) => category.key === key) ?? CATEGORIES[0]
}

// Icono de cada habilidad según su nombre (texto libre, sin tildes ni mayúsculas). Gana la primera
// palabra que coincide al inicio de una palabra del nombre; si ninguna coincide, el de su categoría.
const SKILL_ICONS: [string[], LucideIcon][] = [
  [['velocidad', 'rapidez', 'sprint', 'aceleracion', 'explosividad'], Zap],
  [['agilidad', 'reflejo', 'coordinacion', 'equilibrio'], Rabbit],
  [['resistencia', 'aguante', 'estamina'], HeartPulse],
  [['fuerza', 'potencia'], BicepsFlexed],
  [['salto', 'impulso', 'cabeceo', 'cabezazo', 'juego aereo'], CircleArrowUp],
  [['atajada', 'porteria', 'portero', 'arquero', 'achique'], Hand],
  [['regate', 'dribbling', 'gambeta', 'amague', 'finta'], Footprints],
  [['remate', 'tiro', 'disparo', 'definicion', 'gol', 'lanzamiento', 'punteria'], Crosshair],
  [['pase', 'asistencia', 'centro'], Send],
  [['control', 'conduccion', 'recepcion', 'manejo'], CircleDot],
  [['vision', 'lectura'], Eye],
  [['posicion', 'ubicacion', 'colocacion', 'desmarque'], MapPin],
  [['marcaje', 'defensa', 'anticipacion', 'quite', 'bloqueo', 'intercepcion'], Shield],
  [['estrategia', 'tactica', 'presion', 'transicion'], ChessKnight],
  [['equipo', 'companerismo', 'cooperacion', 'solidaridad'], Handshake],
  [['liderazgo', 'lider', 'capitan'], Crown],
  [['comunicacion'], MessageCircle],
  [['concentracion', 'enfoque', 'atencion', 'inteligencia'], Brain],
  [['disciplina', 'compromiso', 'constancia', 'responsabilidad'], BadgeCheck],
  [['resiliencia', 'caracter', 'temple', 'mentalidad', 'confianza', 'motivacion'], Mountain],
]

export function skillVisual(skill: Pick<Skill, 'name' | 'category'>): { icon: LucideIcon; tone: string } {
  const category = categoryOf(skill.category)
  const text = ` ${normalize(skill.name).replace(/[^a-z0-9]+/g, ' ')} `
  const icon = SKILL_ICONS.find(([words]) => words.some((word) => text.includes(` ${word}`)))?.[1]
  return { icon: icon ?? category.icon, tone: category.tone }
}
