import { request } from './client'
import type { Match } from './matches'
import type { TeamSummary } from './teams'

// Rutas de /api/deportiva/tracking: el seguimiento en vivo de un partido (HU-GC-09, la pizarra).
// Las escrituras van por aquí; los cambios llegan en vivo por el socket (useTrackingSocket).

// Sin iniciar → Activo (iniciar) ⇄ En pausa; Activo o En pausa → Finalizado (no se vuelve a abrir).
// Al registrar el resultado o cancelar el partido, el seguimiento se finaliza solo.
export type TrackingStatus = 'SIN_INICIAR' | 'ACTIVO' | 'PAUSADO' | 'FINALIZADO'

// Las fechas en hora local "AAAA-MM-DDTHH:mm".
export interface TrackingState {
  status: TrackingStatus
  startedAt: string | null
  finishedAt: string | null
}

// x y y van de 0 a 100: porcentaje del largo y del ancho del campo. x = 0 es el arco del local.
// recordedAt lleva segundos y milisegundos ("AAAA-MM-DDTHH:mm:ss.SSS").
export interface LastPosition {
  x: number
  y: number
  recordedAt: string
}

export interface TrackedPlayer {
  id: number
  firstName: string
  lastName: string
  position: string | null // posición de juego (portero, defensa...), si la tiene
  active: boolean
  lastPosition: LastPosition | null // null: todavía no está en la cancha
  onCourt: boolean // está jugando: su última posición no lo sacó de la cancha (false sin posición)
}

// Un equipo con su plantilla del día del partido.
export interface TrackedTeam {
  team: TeamSummary
  players: TrackedPlayer[]
}

export interface TrackedBall {
  id: number
  name: string
  lastPosition: LastPosition | null
}

// Un registro de posición: de un jugador (playerId) o de la pelota (ball = true).
export interface PositionRecord {
  id: number
  matchId: number
  playerId: number | null
  ball: boolean
  x: number
  y: number
  recordedAt: string
  onCourt: boolean // false: con este registro el jugador salió de la cancha (al banco)
}

// El deporte del torneo; parentName sirve con los subdeportes sin cancha propia.
export interface TrackingSport {
  id: number
  name: string
  parentName: string | null
}

// Si el servidor está simulando el partido y cada cuánto mueve a los jugadores (milisegundos).
export interface SimulationState {
  running: boolean
  intervalMs: number | null
}

// La foto de un jugador de la pizarra ("data:image/...").
export interface PlayerPhoto {
  playerId: number
  photo: string
}

// Lo que muestra la pizarra.
export interface TrackingBoard {
  match: Match
  sport: TrackingSport
  tracking: TrackingState
  ball: TrackedBall | null // null hasta que se inicia el seguimiento
  home: TrackedTeam
  away: TrackedTeam
  totals: {
    records: number // posiciones registradas en el partido
    playersTracked: number // jugadores con al menos una
    onCourt: number // jugadores en la cancha ahora
  }
  latest: PositionRecord[] // las últimas, de la más nueva a la más vieja
  simulation: SimulationState // botón "Simular partido"
}

// Un partido de la lista "En vivo".
export interface TrackedMatch {
  match: Match
  tracking: TrackingState
}

// Los partidos en juego y los que ya tuvieron seguimiento: primero los en juego.
export function findTrackedMatches(): Promise<TrackedMatch[]> {
  return request<TrackedMatch[]>('/deportiva/tracking/matches')
}

export function findTrackingBoard(matchId: number): Promise<TrackingBoard> {
  return request<TrackingBoard>(`/deportiva/tracking/matches/${matchId}`)
}

// El historial completo de posiciones, en el orden en que se registraron y por páginas (máximo 1000 por
// página): la primera sin afterId; la siguiente, con el id del último registro recibido.
export const HISTORY_PAGE = 1000

export function findTrackingHistory(matchId: number, afterId: number | null): Promise<PositionRecord[]> {
  const query = new URLSearchParams({ limit: String(HISTORY_PAGE) })
  if (afterId !== null) query.set('afterId', String(afterId))
  return request<PositionRecord[]>(`/deportiva/tracking/matches/${matchId}/positions?${query}`)
}

// Iniciar o reanudar. La primera vez crea la pelota del partido (sin nombre: "Balón del partido").
export function startTracking(matchId: number, ballName: string | null): Promise<TrackingBoard> {
  return request<TrackingBoard>(`/deportiva/tracking/matches/${matchId}/start`, {
    method: 'PATCH',
    body: JSON.stringify(ballName ? { ballName } : {}),
  })
}

export function pauseTracking(matchId: number): Promise<TrackingBoard> {
  return request<TrackingBoard>(`/deportiva/tracking/matches/${matchId}/pause`, { method: 'PATCH' })
}

// No borra nada: el partido, los jugadores, la pelota y las posiciones se conservan.
export function finishTracking(matchId: number): Promise<TrackingBoard> {
  return request<TrackingBoard>(`/deportiva/tracking/matches/${matchId}/finish`, { method: 'PATCH' })
}

// "Simular partido": el servidor mueve a los jugadores cada intervalMs (500, 1000 o 2000). Solo con el
// partido en juego y el seguimiento activo.
export function startSimulation(matchId: number, intervalMs: number): Promise<TrackingBoard> {
  return request<TrackingBoard>(`/deportiva/tracking/matches/${matchId}/simulation/start`, {
    method: 'PATCH',
    body: JSON.stringify({ intervalMs }),
  })
}

export function stopSimulation(matchId: number): Promise<TrackingBoard> {
  return request<TrackingBoard>(`/deportiva/tracking/matches/${matchId}/simulation/stop`, { method: 'PATCH' })
}

// Las fotos de los jugadores de las dos plantillas que tienen foto. Se piden una vez por pizarra.
export function findTrackingPhotos(matchId: number): Promise<PlayerPhoto[]> {
  return request<PlayerPhoto[]>(`/deportiva/tracking/matches/${matchId}/photos`)
}
