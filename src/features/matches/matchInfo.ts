import type { Match, MatchResult, MatchStatus } from '../../api/matches'
import { formatDateShort } from '../../utils/dates'
import { plural } from '../../utils/plural'

// Textos, colores y cuentas de los partidos que comparten la pantalla Partidos, las llaves de Fases y
// grupos y el detalle de un torneo (HU-GC-06 y 07).

// Cada estado con el color de su etiqueta (.tag).
export const MATCH_STATUSES: Record<MatchStatus, { label: string; tone: string }> = {
  PROGRAMADO: { label: 'Programado', tone: 'var(--tone-blue)' },
  EN_JUEGO: { label: 'En juego', tone: 'var(--tone-green)' },
  FINALIZADO: { label: 'Finalizado', tone: 'var(--muted)' },
  CANCELADO: { label: 'Cancelado', tone: 'var(--tone-red)' },
}

export const STATUS_ORDER: MatchStatus[] = ['EN_JUEGO', 'PROGRAMADO', 'FINALIZADO', 'CANCELADO']

// "Atlético Manizales vs Cóndores FC"
export function matchTitle(match: Pick<Match, 'homeTeam' | 'awayTeam'>): string {
  return `${match.homeTeam.name} vs ${match.awayTeam.name}`
}

// "2026-12-15T18:00" → { date: "15/12/2026", time: "18:00" }
export function matchWhen(scheduledAt: string): { date: string; time: string } {
  return { date: formatDateShort(scheduledAt.slice(0, 10)), time: scheduledAt.slice(11, 16) }
}

// Dónde se juega dentro del torneo, sin la fase: "Grupo A · Jornada 2" o "Llave 1".
export function matchSlot(match: Match): string {
  if (match.bracketPosition !== null) return `Llave ${match.bracketPosition}`
  return [match.group?.name, match.round !== null ? `Jornada ${match.round}` : null].filter(Boolean).join(' · ')
}

// Con la fase: "Fase de grupos · Grupo A · Jornada 2".
export function matchPlace(match: Match): string {
  const slot = matchSlot(match)
  return slot ? `${match.phase.name} · ${slot}` : match.phase.name
}

// El marcador que se muestra: el oficial si ya tiene; si se está jugando, lo que suman las anotaciones
// (en vivo); si no, ninguno.
export function shownScore(match: Match): { home: number; away: number; live: boolean } | null {
  if (match.result) return { home: match.result.homeScore, away: match.result.awayScore, live: false }
  if (match.status === 'EN_JUEGO') return { ...match.liveScore, live: true }
  return null
}

// Quién ganó, por el marcador o por los penales. null: sin resultado o empate (solo en grupos).
export function winnerSide(result: MatchResult | null): 'home' | 'away' | null {
  if (!result) return null
  if (result.homeScore !== result.awayScore) return result.homeScore > result.awayScore ? 'home' : 'away'
  if (result.homePenalties !== null && result.awayPenalties !== null) {
    return result.homePenalties > result.awayPenalties ? 'home' : 'away'
  }
  return null
}

// "a, b y c"
function joinList(parts: string[]): string {
  return parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}`
}

function count(matches: Match[], status: MatchStatus): number {
  return matches.filter((match) => match.status === status).length
}

// "2 programados, 1 en juego y 3 finalizados"
function statusParts(matches: Match[]): string {
  const parts = [
    count(matches, 'EN_JUEGO') > 0 ? `${count(matches, 'EN_JUEGO')} en juego` : null,
    count(matches, 'PROGRAMADO') > 0 ? plural(count(matches, 'PROGRAMADO'), 'programado', 'programados') : null,
    count(matches, 'FINALIZADO') > 0 ? plural(count(matches, 'FINALIZADO'), 'finalizado', 'finalizados') : null,
    count(matches, 'CANCELADO') > 0 ? plural(count(matches, 'CANCELADO'), 'cancelado', 'cancelados') : null,
  ].filter((part): part is string => part !== null)
  return joinList(parts)
}

// "Copa Caldas tiene 6 partidos: 2 programados, 1 en juego y 3 finalizados."
export function matchesSentence(tournamentName: string, matches: Match[]): string {
  if (matches.length === 0) return `${tournamentName} todavía no tiene partidos.`
  return `${tournamentName} tiene ${plural(matches.length, 'partido', 'partidos')}: ${statusParts(matches)}.`
}

// La de la lista general: "Hay 9 partidos en 3 torneos: 1 en juego, 5 programados y 3 finalizados."
export function allMatchesSentence(matches: Match[]): string {
  if (matches.length === 0) return 'Todavía no hay partidos en ningún torneo.'
  const tournaments = new Set(matches.map((match) => match.tournament.id)).size
  const total = matches.length === 1 ? 'Hay 1 partido' : `Hay ${matches.length} partidos`
  return `${total} en ${plural(tournaments, 'torneo', 'torneos')}: ${statusParts(matches)}.`
}

// En corto, para la tarjeta "Partidos" del detalle de un torneo: "6 partidos · 1 en juego".
export function matchesShort(matches: Match[]): string {
  if (matches.length === 0) return 'Todavía sin partidos'
  const total = plural(matches.length, 'partido', 'partidos')
  const live = count(matches, 'EN_JUEGO')
  if (live > 0) return `${total} · ${live} en juego`
  const finished = count(matches, 'FINALIZADO')
  return `${total} · ${plural(finished, 'finalizado', 'finalizados')}`
}
