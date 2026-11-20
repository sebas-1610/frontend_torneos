import { ClipboardList, Layers, type LucideIcon } from 'lucide-react'

// Las pantallas que trabajan sobre un torneo. Se abren desde las tarjetas del detalle en Torneos y se
// pasa de una a otra con las pestañas (TournamentTabs). Cuando existan Partidos y Desarrollo, se suman
// aquí y aparecen en los dos lugares.
export type TournamentScreenId = 'torneos-inscripciones' | 'torneos-fases'

export interface TournamentScreen {
  page: TournamentScreenId // el id de la pantalla en App.tsx (y en canOpenPage)
  label: string
  icon: LucideIcon
  tone: string // variable de color de su tarjeta: "--tone-blue"
}

export const TOURNAMENT_SCREENS: TournamentScreen[] = [
  { page: 'torneos-inscripciones', label: 'Inscripciones', icon: ClipboardList, tone: '--tone-blue' },
  { page: 'torneos-fases', label: 'Fases y grupos', icon: Layers, tone: '--tone-purple' },
]

export function screenHref(page: TournamentScreenId, tournamentId: number): string {
  return `#${page}/${tournamentId}`
}
