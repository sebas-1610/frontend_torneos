import type { Tournament, TournamentCategory, TournamentStatus } from '../../api/tournaments'
import { formatDateShort, today } from '../../utils/dates'

// Textos y colores de un torneo que comparten Torneos, Inscripciones y el detalle de un equipo.

export const CATEGORIES: { value: TournamentCategory; label: string }[] = [
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'FEMENINO', label: 'Femenino' },
  { value: 'MIXTO', label: 'Mixto' },
]

export function categoryLabel(category: TournamentCategory): string {
  return CATEGORIES.find((item) => item.value === category)?.label ?? category
}

// Cada estado con su color de etiqueta (.tag): por iniciar azul, en curso verde, finalizado gris.
export const STATUSES: Record<TournamentStatus, { label: string; tone: string }> = {
  POR_INICIAR: { label: 'Por iniciar', tone: 'var(--tone-blue)' },
  EN_CURSO: { label: 'En curso', tone: 'var(--tone-green)' },
  FINALIZADO: { label: 'Finalizado', tone: 'var(--muted)' },
}

// Días de competencia, contando el primero y el último: del 01/03 al 03/03 son 3.
export function durationDays(tournament: Pick<Tournament, 'startDate' | 'endDate'>): number {
  const start = Date.parse(`${tournament.startDate}T00:00:00Z`)
  const end = Date.parse(`${tournament.endDate}T00:00:00Z`)
  return Math.round((end - start) / 86_400_000) + 1
}

// Último día para inscribir o retirar equipos: el cierre, o el día antes de empezar si no tiene.
function lastRegistrationDay(tournament: Tournament): string {
  if (tournament.registrationDeadline) return tournament.registrationDeadline
  const start = new Date(`${tournament.startDate}T00:00:00Z`)
  start.setUTCDate(start.getUTCDate() - 1)
  return start.toISOString().slice(0, 10)
}

// Cómo están hoy las inscripciones, en una frase. El backend dice si están abiertas
// (registrationOpen); aquí solo se arma el porqué, con las mismas reglas (tournament-status.ts).
export function registrationText(tournament: Tournament): string {
  if (tournament.registrationOpen) {
    return `Abiertas hasta el ${formatDateShort(lastRegistrationDay(tournament))}.`
  }
  if (!tournament.active) return 'Cerradas: el torneo está desactivado.'
  if (tournament.startDate <= today()) return `Cerradas: el torneo inició el ${formatDateShort(tournament.startDate)}.`
  return `Cerradas: el último día fue el ${formatDateShort(lastRegistrationDay(tournament))}.`
}

// Lo mismo en corto, para la tarjeta "Inscripciones" del detalle: el porqué de "Cerradas" se lee en la
// pantalla Inscripciones.
export function registrationShort(tournament: Tournament): string {
  return tournament.registrationOpen
    ? `Abiertas hasta el ${formatDateShort(lastRegistrationDay(tournament))}`
    : 'Cerradas'
}

// La misma frase con su sujeto, para ponerla sola: "Inscripciones abiertas hasta el 10/02/2026."
export function registrationSentence(tournament: Tournament): string {
  const text = registrationText(tournament)
  return `Inscripciones ${text.charAt(0).toLowerCase()}${text.slice(1)}`
}
