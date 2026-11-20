import { request } from './client'
import type { Match } from './matches'
import type { PhaseSummary, PhaseType } from './phases'
import type { Score } from './scores'
import type { TeamSummary } from './teams'
import type { Tournament } from './tournaments'

// Ruta /api/deportiva/tournaments/{id}/development (ms_torneos_deportiva, HU-GC-08): todo lo que muestra
// "Desarrollo del torneo" en una sola respuesta. Solo se consulta; el backend calcula las tablas de
// posiciones, las llaves y el resumen.

// Un partido con sus anotaciones (las de las tarjetas y el detalle).
export interface DevelopmentMatch extends Match {
  scores: Score[]
}

// Una fila de la tabla de posiciones de un grupo.
export interface StandingRow {
  position: number
  team: TeamSummary
  played: number // PJ
  won: number // PG
  drawn: number // PE
  lost: number // PP
  scoredFor: number // GF: goles, puntos... según el deporte
  scoredAgainst: number // GC
  difference: number // DG
  points: number // PTS
  qualifies: boolean // está en los puestos que pasan a la fase siguiente
}

export interface GroupStandings {
  id: number
  name: string
  standings: StandingRow[]
}

// Una posición de la llave de una fase final: su partido (null si todavía no se programa) y, si ya
// terminó, quién ganó.
export interface BracketSlot {
  position: number
  match: DevelopmentMatch | null
  winner: TeamSummary | null
}

export interface PhaseDevelopment {
  id: number
  name: string
  type: PhaseType
  order: number
  qualifiersPerGroup: number | null
  teamsCount: number | null
  finished: number // partidos con resultado
  pending: number // programados o en juego
  cancelled: number
  groups: GroupStandings[] | null // solo en fase de grupos
  bracket: BracketSlot[] | null // solo en fase final
  matches: DevelopmentMatch[] // por fecha
}

// "Estado de la competencia". Los cancelados no cuentan en matches ni en el porcentaje.
export interface DevelopmentSummary {
  teams: number
  matches: number
  finished: number
  pending: number
  cancelled: number
  progress: number // 0 a 100: partidos finalizados sobre los que cuentan
  currentPhase: PhaseSummary | null // la primera con partidos pendientes; null sin partidos
  activeTeams: number
  eliminatedTeams: number
  totalScored: number // suma de los marcadores oficiales
}

export interface TournamentDevelopment {
  tournament: Tournament
  summary: DevelopmentSummary
  phases: PhaseDevelopment[] // en el orden en que se juegan
}

export function findTournamentDevelopment(tournamentId: number): Promise<TournamentDevelopment> {
  return request<TournamentDevelopment>(`/deportiva/tournaments/${tournamentId}/development`)
}
