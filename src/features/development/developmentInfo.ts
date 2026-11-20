import type {
  DevelopmentMatch,
  DevelopmentSummary,
  PhaseDevelopment,
  TournamentDevelopment,
} from '../../api/development'

// Textos y cuentas de "Desarrollo del torneo" (HU-GC-08) que comparten la pantalla y la tarjeta
// "Desarrollo" del detalle de un torneo.

// "26 de 38 partidos jugados"
function playedText({ finished, matches }: DevelopmentSummary): string {
  return `${finished} de ${matches} ${matches === 1 ? 'partido jugado' : 'partidos jugados'}`
}

// Lo que hoy importa del torneo: en qué fase va y cuánto lleva.
// "Copa Manizales va en Semifinal: 26 de 38 partidos jugados (68 %)."
export function developmentSentence({ tournament, summary, phases }: TournamentDevelopment): string {
  if (phases.length === 0) return `${tournament.name} todavía no tiene fases.`
  if (summary.matches === 0) return `${tournament.name} todavía no tiene partidos por jugar.`
  if (summary.pending === 0) {
    return summary.matches === 1
      ? `${tournament.name} ya jugó su único partido.`
      : `${tournament.name} ya jugó sus ${summary.matches} partidos.`
  }
  const phase = summary.currentPhase ? ` va en ${summary.currentPhase.name}:` : ':'
  return `${tournament.name}${phase} ${playedText(summary)} (${summary.progress} %).`
}

// En corto, para la tarjeta "Desarrollo" del detalle de un torneo: "68 % · Semifinal".
export function developmentShort(summary: DevelopmentSummary): string {
  if (summary.matches === 0) return 'Todavía sin partidos'
  if (summary.pending === 0) return 'Completado · 100 %'
  return summary.currentPhase ? `${summary.progress} % · ${summary.currentPhase.name}` : `${summary.progress} %`
}

// El partido que se muestra si no se elige otro: el que se está jugando; si no, el último con
// resultado; si no, el próximo programado.
export function featuredMatch(matches: DevelopmentMatch[]): DevelopmentMatch | null {
  return (
    matches.find((match) => match.status === 'EN_JUEGO') ??
    matches.findLast((match) => match.status === 'FINALIZADO') ??
    matches.find((match) => match.status === 'PROGRAMADO') ??
    matches[0] ??
    null
  )
}

// Cuánto lleva jugado una fase (0 a 1): sus finalizados sobre los que cuentan (sin cancelados).
// null si todavía no tiene partidos.
export function phaseProgress(phase: PhaseDevelopment): number | null {
  const counted = phase.finished + phase.pending
  return counted === 0 ? null : phase.finished / counted
}

// La fase que se abre primero: la que se está jugando; si no hay, la primera.
export function firstPhaseId({ summary, phases }: TournamentDevelopment): number | null {
  return summary.currentPhase?.id ?? phases[0]?.id ?? null
}

// "+4", "0", "-2": la diferencia con su signo, como en una tabla de posiciones.
export function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}
