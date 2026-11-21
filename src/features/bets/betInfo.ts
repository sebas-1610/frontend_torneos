import type { Bet, BetSelection, BetStatus } from '../../api/bets'
import type { MatchBetting } from '../../api/matches'
import type { TeamSummary } from '../../api/teams'
import { formatMoney } from '../../utils/money'
import { plural } from '../../utils/plural'

// Textos y reglas de las apuestas (HU-GC-11) que comparten la pantalla del aficionado, su formulario y
// la sección "Cuotas y apuestas" del detalle de un partido.

// Cada estado con el color de su etiqueta (.tag).
export const BET_STATUSES: Record<BetStatus, { label: string; tone: string }> = {
  PENDIENTE: { label: 'Pendiente', tone: 'var(--tone-blue)' },
  GANADA: { label: 'Ganada', tone: 'var(--tone-green)' },
  PERDIDA: { label: 'Perdida', tone: 'var(--tone-red)' },
  ANULADA: { label: 'Anulada', tone: 'var(--muted)' },
  CANCELADA: { label: 'Cancelada', tone: 'var(--muted)' },
}

// Cómo se llama cada opción sin el equipo: "Local", "Empate", "Visitante".
export const SELECTION_ROLES: Record<BetSelection, string> = {
  LOCAL: 'Local',
  EMPATE: 'Empate',
  VISITANTE: 'Visitante',
}

// Por quién apostó: el nombre del equipo, o "Empate".
export function selectionLabel(selection: BetSelection, match: { homeTeam: TeamSummary; awayTeam: TeamSummary }): string {
  if (selection === 'LOCAL') return match.homeTeam.name
  if (selection === 'VISITANTE') return match.awayTeam.name
  return 'Empate'
}

// Las opciones de un partido con su cuota. Sin cuota de empate (fase final), no hay empate.
export function selectionsOf(betting: MatchBetting): { selection: BetSelection; odds: number }[] {
  return [
    { selection: 'LOCAL' as const, odds: betting.homeOdds },
    ...(betting.drawOdds !== null ? [{ selection: 'EMPATE' as const, odds: betting.drawOdds }] : []),
    { selection: 'VISITANTE' as const, odds: betting.awayOdds },
  ]
}

// valor × cuota, redondeado a centavos (como winningPayout del backend).
export function payoutFor(amount: number, odds: number): number {
  return Math.round(amount * odds * 100) / 100
}

// "AAAA-MM-DDTHH:mm" de ahora, en hora local: como se compara la hora del partido en el backend.
function nowLocal(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

// Se puede cambiar o cancelar: sigue pendiente y su partido no ha empezado (ensureChangeable del backend).
export function changeable(bet: Bet): boolean {
  return bet.status === 'PENDIENTE' && bet.match.status === 'PROGRAMADO' && bet.match.scheduledAt > nowLocal()
}

// Por qué ya no se puede cambiar, para el título del botón apagado.
export function lockedReason(bet: Bet): string {
  if (bet.status !== 'PENDIENTE') return `La apuesta ya está ${BET_STATUSES[bet.status].label.toLowerCase()}`
  return 'El partido ya empezó'
}

// Lo que pagó o paga: ganada, el premio; perdida, 0; anulada o cancelada, lo devuelto.
export function payoutText(bet: Bet): string {
  if (bet.payout === null) return `Si aciertas: ${formatMoney(bet.potentialPayout)}`
  if (bet.status === 'ANULADA' || bet.status === 'CANCELADA') return `Devuelto: ${formatMoney(bet.payout)}`
  return formatMoney(bet.payout)
}

// Lo que hoy importa de las apuestas del aficionado.
// "Tienes 2 apuestas pendientes por $ 25.000 y has cobrado $ 18.500 en apuestas ganadas."
export function betsSentence(bets: Bet[], openMatches: number): string {
  const open = openMatches > 0 ? plural(openMatches, 'partido abierto', 'partidos abiertos') : null
  if (bets.length === 0) {
    return open ? `Hay ${open} para apostar. Todavía no tienes apuestas.` : 'Todavía no tienes apuestas y no hay partidos abiertos para apostar.'
  }
  const pending = bets.filter((bet) => bet.status === 'PENDIENTE')
  const won = bets.filter((bet) => bet.status === 'GANADA')
  const staked = pending.reduce((total, bet) => total + bet.amount, 0)
  const cashed = won.reduce((total, bet) => total + (bet.payout ?? 0), 0)
  const pendingText =
    pending.length > 0
      ? `Tienes ${pending.length === 1 ? 'una apuesta pendiente' : `${pending.length} apuestas pendientes`} por ${formatMoney(staked)}`
      : 'No tienes apuestas pendientes'
  const wonText =
    won.length > 0 ? ` y has cobrado ${formatMoney(cashed)} en ${plural(won.length, 'apuesta ganada', 'apuestas ganadas')}` : ''
  return `${pendingText}${wonText}.`
}
