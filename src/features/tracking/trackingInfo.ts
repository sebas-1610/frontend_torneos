import type {
  LastPosition,
  PositionRecord,
  TrackedPlayer,
  TrackedTeam,
  TrackingBoard,
  TrackingSport,
  SimulationState,
  TrackingState,
  TrackingStatus,
} from '../../api/tracking'
import { sportKindOf, type SportKind } from '../sports/sportKind'

// Lo que la pizarra calcula sin dibujar nada (HU-GC-09): la cancha del deporte, las iniciales, los textos
// y cómo queda la pizarra cuando llega un aviso del socket.

// Cuántas posiciones recientes muestra "Últimas actualizaciones" (las mismas que trae el backend).
const LATEST_COUNT = 10

export const TRACKING_STATUSES: Record<TrackingStatus, { label: string; tone: string }> = {
  SIN_INICIAR: { label: 'Sin iniciar', tone: 'var(--muted)' },
  ACTIVO: { label: 'Activo', tone: 'var(--tone-green)' },
  PAUSADO: { label: 'En pausa', tone: 'var(--tone-amber)' },
  FINALIZADO: { label: 'Finalizado', tone: 'var(--muted)' },
}

// Las canchas que se dibujan. Otro deporte (o un subdeporte sin nombre conocido y con un padre que
// tampoco lo tiene) se ve como un rectángulo con su media cancha.
export type FieldKind = 'soccer' | 'futsal' | 'basketball' | 'volleyball' | 'generic'

function fieldOfName(name: string | null): FieldKind {
  if (!name) return 'generic'
  switch (sportKindOf(name)) {
    case 'soccer':
      return 'soccer'
    case 'futsal':
    case 'street':
      return 'futsal'
    case 'basketball':
      return 'basketball'
    case 'volleyball':
      return 'volleyball'
    default:
      return 'generic'
  }
}

// La cancha del deporte del torneo; un subdeporte sin cancha propia usa la de su padre.
export function fieldKindOf(sport: TrackingSport): FieldKind {
  const own = fieldOfName(sport.name)
  return own !== 'generic' ? own : fieldOfName(sport.parentName)
}

// El balón del deporte del torneo (el mismo dibujo de SportIcon en Deportes); un subdeporte sin balón propio
// usa el de su padre.
export function ballKindOf(sport: TrackingSport): SportKind {
  const own = sportKindOf(sport.name)
  return own !== 'generic' || !sport.parentName ? own : sportKindOf(sport.parentName)
}

// Iniciales para el círculo del jugador (criterio 4): "Andrés Arias" → "AA".
export function initialsOf(player: Pick<TrackedPlayer, 'firstName' | 'lastName'>): string {
  const first = player.firstName.trim().charAt(0)
  const last = player.lastName.trim().charAt(0)
  return `${first}${last}`.toUpperCase()
}

export function fullName(player: Pick<TrackedPlayer, 'firstName' | 'lastName'>): string {
  return `${player.firstName} ${player.lastName}`
}

// Coordenada con un decimal y coma: 54.25 → "54,3".
export function formatCoord(value: number): string {
  return value.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export function formatCount(value: number): string {
  return value.toLocaleString('es-CO')
}

// "2026-11-22T18:04:31.250" → "18:04:31".
export function clockOf(recordedAt: string): string {
  return recordedAt.slice(11, 19)
}

// "2026-11-22T18:04" → "22/11/2026 · 18:04".
export function dateTimeOf(value: string): string {
  const [date, time] = value.split('T')
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year} · ${time.slice(0, 5)}`
}

// Los que están jugando: tienen posición y la última no los sacó de la cancha (los del banco no se dibujan).
export function onField(team: TrackedTeam): TrackedPlayer[] {
  return team.players.filter((player) => player.lastPosition !== null && player.onCourt)
}

// La frase del encabezado: lo que hoy importa de este seguimiento.
export function boardSentence(board: TrackingBoard): string {
  const records = board.totals.records
  const recordsText = `${formatCount(records)} ${records === 1 ? 'posición registrada' : 'posiciones registradas'}`
  const players = onField(board.home).length + onField(board.away).length
  const playersText = `${players} ${players === 1 ? 'jugador' : 'jugadores'} en la cancha`
  switch (board.tracking.status) {
    case 'SIN_INICIAR':
      return board.match.status === 'EN_JUEGO'
        ? 'El partido está en juego y su seguimiento todavía no se inicia.'
        : 'El seguimiento se puede iniciar cuando el partido esté en juego.'
    case 'ACTIVO':
      return `Seguimiento en vivo: ${playersText} y ${recordsText}.`
    case 'PAUSADO':
      return `Seguimiento en pausa con ${recordsText}.`
    case 'FINALIZADO':
      return `Seguimiento finalizado con ${recordsText}. El recorrido queda guardado.`
  }
}

function toLast(record: PositionRecord): LastPosition {
  return { x: record.x, y: record.y, recordedAt: record.recordedAt }
}

// La pizarra con las posiciones que acaban de llegar por el socket: cada jugador y la pelota quedan en
// su último registro, las últimas actualizaciones se corren y los contadores suben.
export function applyPositions(board: TrackingBoard, records: PositionRecord[]): TrackingBoard {
  const known = new Set(board.latest.map((record) => record.id))
  const fresh = records.filter((record) => !known.has(record.id))
  if (fresh.length === 0) return board

  const byPlayer = new Map<number, PositionRecord>()
  let ball: PositionRecord | undefined
  for (const record of fresh) {
    if (record.playerId !== null) byPlayer.set(record.playerId, record)
    else ball = record
  }
  const moveTeam = (team: TrackedTeam): TrackedTeam => ({
    ...team,
    players: team.players.map((player) => {
      const record = byPlayer.get(player.id)
      return record ? { ...player, lastPosition: toLast(record), onCourt: record.onCourt } : player
    }),
  })
  const home = moveTeam(board.home)
  const away = moveTeam(board.away)

  return {
    ...board,
    home,
    away,
    ball: board.ball && ball ? { ...board.ball, lastPosition: toLast(ball) } : board.ball,
    latest: [...fresh].reverse().concat(board.latest).slice(0, LATEST_COUNT),
    totals: {
      records: board.totals.records + fresh.length,
      playersTracked: [...home.players, ...away.players].filter((player) => player.lastPosition !== null).length,
      onCourt: onField(home).length + onField(away).length,
    },
  }
}

export function applyStatus(board: TrackingBoard, tracking: TrackingState): TrackingBoard {
  return { ...board, tracking }
}

// Las velocidades del botón "Simular partido": cada cuánto el servidor mueve a los jugadores.
export const SIMULATION_SPEEDS = [
  { intervalMs: 2000, label: 'Lenta' },
  { intervalMs: 1000, label: 'Normal' },
  { intervalMs: 500, label: 'Rápida' },
] as const

export function applySimulation(board: TrackingBoard, simulation: SimulationState): TrackingBoard {
  return { ...board, simulation }
}
