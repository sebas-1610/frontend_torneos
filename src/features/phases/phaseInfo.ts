import { GitMerge, Grid2x2, type LucideIcon } from 'lucide-react'
import type { Phase, PhaseType } from '../../api/phases'
import { initials } from '../../utils/initials'
import { plural } from '../../utils/plural'
import { normalize } from '../roles/labels'

// Textos, colores y cuentas de las fases que comparten la pantalla Fases y grupos y el detalle de un
// torneo (HU-GC-03, 04 y 05).

interface PhaseTypeInfo {
  label: string // "Fase de grupos"
  short: string // lo que dice su etiqueta: "Grupos"
  tone: string // color de la etiqueta (.tag)
  icon: LucideIcon
  description: string // qué significa, en el formulario
}

export const PHASE_TYPES: Record<PhaseType, PhaseTypeInfo> = {
  GRUPOS: {
    label: 'Fase de grupos',
    short: 'Grupos',
    tone: 'var(--tone-teal)',
    icon: Grid2x2,
    description: 'Los equipos se reparten en grupos y pasan los primeros de cada uno.',
  },
  FINAL: {
    label: 'Fase final',
    short: 'Final',
    tone: 'var(--tone-amber)',
    icon: GitMerge,
    description: 'Eliminación directa: cada llave es un partido y quien gana sigue.',
  },
}

// Si no se dice cuántos pasan por grupo, el backend deja 2 (DEFAULT_QUALIFIERS_PER_GROUP).
export const DEFAULT_QUALIFIERS = 2

// Los equipos que puede jugar una fase final (FINAL_TEAMS_COUNTS del backend) y el nombre de esa ronda.
export const FINAL_ROUNDS = [
  { teams: 2, name: 'Final' },
  { teams: 4, name: 'Semifinal' },
  { teams: 8, name: 'Cuartos de final' },
  { teams: 16, name: 'Octavos de final' },
  { teams: 32, name: 'Dieciseisavos de final' },
  { teams: 64, name: 'Treintaidosavos de final' },
]

export function roundName(teams: number): string {
  return FINAL_ROUNDS.find((round) => round.teams === teams)?.name ?? ''
}

// Cada llave de una fase final es un partido entre dos equipos.
export function bracketsOf(phase: Pick<Phase, 'teamsCount'>): number {
  return (phase.teamsCount ?? 0) / 2
}

export function qualifiersText(qualifiers: number): string {
  return qualifiers === 1 ? 'pasa 1 por grupo' : `pasan ${qualifiers} por grupo`
}

// Lo que se lee debajo del nombre en la lista de fases.
export function phaseMeta(phase: Phase): string {
  if (phase.type === 'GRUPOS') {
    return `${plural(phase.groupsCount ?? 0, 'grupo', 'grupos')} · ${qualifiersText(phase.qualifiersPerGroup ?? DEFAULT_QUALIFIERS)}`
  }
  return `${phase.teamsCount ?? 0} equipos · ${plural(bracketsOf(phase), 'llave', 'llaves')}`
}

// Cuántos equipos deja pasar una fase a la siguiente: de grupos, los clasificados de todos sus grupos;
// final, los ganadores de sus llaves.
export function advancingTeams(phase: Phase): number {
  return phase.type === 'GRUPOS'
    ? (phase.groupsCount ?? 0) * (phase.qualifiersPerGroup ?? DEFAULT_QUALIFIERS)
    : bracketsOf(phase)
}

// Si los equipos que deja pasar la fase anterior llenan la fase final. Es solo un aviso: el backend no
// lo exige (los equipos de cada llave se eligen al programar sus partidos).
export function feedFrom(previous: Phase, phase: Phase): { fits: boolean; text: string } {
  const teams = phase.teamsCount ?? 0
  if (previous.type === 'GRUPOS' && (previous.groupsCount ?? 0) === 0) {
    return {
      fits: false,
      text: `"${previous.name}" todavía no tiene grupos: cuando los tenga se sabrá cuántos equipos pasan a esta fase.`,
    }
  }
  const incoming = advancingTeams(previous)
  if (incoming === teams) {
    return { fits: true, text: `Recibe a los ${teams} equipos que pasan de "${previous.name}".` }
  }
  const detail =
    previous.type === 'GRUPOS'
      ? ` (${plural(previous.groupsCount ?? 0, 'grupo', 'grupos')}, ${qualifiersText(previous.qualifiersPerGroup ?? DEFAULT_QUALIFIERS)})`
      : ''
  return {
    fits: false,
    text: `De "${previous.name}" pasan ${incoming} equipos${detail}, pero esta fase es de ${teams}. Revisa una de las dos.`,
  }
}

// "Copa Caldas tiene 3 fases: 1 de grupos y 2 finales."
export function phasesSentence(tournamentName: string, phases: Phase[]): string {
  if (phases.length === 0) return `${tournamentName} todavía no tiene fases.`
  const groups = phases.filter((phase) => phase.type === 'GRUPOS').length
  const finals = phases.length - groups
  const parts = [
    groups > 0 ? `${groups} de grupos` : null,
    finals > 0 ? (finals === 1 ? '1 final' : `${finals} finales`) : null,
  ].filter(Boolean)
  return `${tournamentName} tiene ${plural(phases.length, 'fase', 'fases')}: ${parts.join(' y ')}.`
}

// En corto, para la tarjeta "Fases y grupos" del detalle de un torneo: "2 fases · 4 grupos".
export function phasesShort(phases: Phase[]): string {
  if (phases.length === 0) return 'Todavía sin fases'
  const groups = phases.reduce((sum, phase) => sum + (phase.type === 'GRUPOS' ? (phase.groupsCount ?? 0) : 0), 0)
  const count = plural(phases.length, 'fase', 'fases')
  return groups > 0 ? `${count} · ${plural(groups, 'grupo', 'grupos')}` : count
}

// El nombre que se propone para un grupo nuevo: la primera letra libre ("Grupo A", "Grupo B"...).
export function nextGroupName(groups: { name: string }[]): string {
  const used = new Set(groups.map((group) => normalize(group.name.trim())))
  for (let index = 0; index < 26; index++) {
    const name = `Grupo ${String.fromCharCode(65 + index)}`
    if (!used.has(normalize(name))) return name
  }
  return ''
}

// La marca de la tarjeta de un grupo: "Grupo A" → "A"; "Zona norte" → "ZN".
export function groupMark(name: string): string {
  const rest = name.trim().replace(/^grupo\s+/i, '')
  return (rest.length <= 2 ? rest : initials(rest)).toUpperCase()
}
