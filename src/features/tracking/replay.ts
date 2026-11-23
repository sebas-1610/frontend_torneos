import type { LastPosition, PositionRecord } from '../../api/tracking'

// El recorrido de un partido (HU-GC-09, criterio 13: los registros conservados sirven para representar el
// seguimiento realizado). Lógica pura, sin React: arma los cuadros a partir del historial y dice cuánto
// esperar entre uno y otro.

// Un momento del partido: dónde estaba cada jugador y la pelota en ese instante (la última posición que
// tenían hasta ahí, aunque en ese lote no se movieran).
export interface ReplayFrame {
  at: string // recordedAt del lote, "AAAA-MM-DDTHH:mm:ss.SSS"
  players: Record<number, LastPosition>
  ball: LastPosition | null
}

// Las velocidades de la reproducción.
export const REPLAY_SPEEDS = [1, 2, 4, 8] as const
export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number]

// Entre dos lotes se espera lo mismo que pasó en el partido, pero sin pasar de 2 s (si el seguimiento estuvo
// en pausa, la repetición no se queda quieta) ni bajar de 100 ms; luego se divide por la velocidad.
const MIN_GAP_MS = 100
const MAX_GAP_MS = 2000

// Cada lote que envía el script comparte la hora (la pone el servidor): un lote es un cuadro. El historial
// llega en el orden en que se registró.
export function buildFrames(records: PositionRecord[]): ReplayFrame[] {
  const frames: ReplayFrame[] = []
  let players: Record<number, LastPosition> = {}
  let ball: LastPosition | null = null
  let current: string | null = null

  for (const record of records) {
    if (current !== null && record.recordedAt !== current) {
      frames.push({ at: current, players, ball })
      players = { ...players } // el cuadro siguiente parte del anterior
    }
    current = record.recordedAt
    const at: LastPosition = { x: record.x, y: record.y, recordedAt: record.recordedAt }
    if (record.playerId !== null) players[record.playerId] = at
    else ball = at
  }
  if (current !== null) frames.push({ at: current, players, ball })
  return frames
}

function millisOf(recordedAt: string): number {
  return new Date(recordedAt).getTime()
}

// Cuánto se muestra el cuadro antes de pasar al siguiente, a la velocidad elegida.
export function frameDelay(frames: ReplayFrame[], index: number, speed: ReplaySpeed): number {
  const next = frames[index + 1]
  if (!next) return 0
  const gap = millisOf(next.at) - millisOf(frames[index].at)
  const clamped = Math.min(MAX_GAP_MS, Math.max(MIN_GAP_MS, Number.isFinite(gap) ? gap : 1000))
  return clamped / speed
}
