import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import type { PositionRecord, SimulationState, TrackingState } from '../api/tracking'
import { getSession } from '../auth/session'

// El socket vive bajo /api/deportiva, así el proxy de Vite (con ws: true) lo manda a ms_torneos_deportiva.
const SOCKET_PATH = '/api/deportiva/socket.io'

// conectando: todavía no entra a la sala · en-vivo: recibe los cambios · sin-conexion: se cayó y
// socket.io reintenta solo · rechazado: el backend no lo dejó entrar (rejection dice por qué).
export type LiveConnection = 'conectando' | 'en-vivo' | 'sin-conexion' | 'rechazado'

export interface TrackingSocketHandlers {
  onPositions: (records: PositionRecord[]) => void // las posiciones recién guardadas
  onStatus: (state: TrackingState) => void // el estado nuevo del seguimiento
  onSimulation: (state: SimulationState) => void // la simulación del partido empezó o terminó
  onResync: () => void // entró (o volvió a entrar) a la sala: hay que recargar la pizarra por lo perdido
}

interface StatusEvent extends TrackingState {
  matchId: number
}

type JoinReply = { ok: true } | { error: string }

// Pizarra en vivo (HU-GC-09, criterios 9 y 10): se conecta al socket con el token de la sesión, entra a la
// sala del partido y entrega cada cambio. Solo trae los avisos; qué hacer con ellos lo decide la pantalla.
export function useTrackingSocket(matchId: number, handlers: TrackingSocketHandlers) {
  const [connection, setConnection] = useState<LiveConnection>('conectando')
  const [rejection, setRejection] = useState<string | null>(null)
  // Los handlers cambian en cada render; el socket se conecta una sola vez por partido.
  const handlersRef = useRef(handlers)
  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    const socket = io({
      path: SOCKET_PATH,
      // Una función: cada reconexión toma el token vigente.
      auth: (send) => send({ token: getSession()?.accessToken ?? '' }),
    })

    socket.on('connect', () => {
      socket.emit('join', { matchId }, (reply: JoinReply) => {
        if ('ok' in reply) {
          setConnection('en-vivo')
          setRejection(null)
          // Lo que cambió mientras no estaba en la sala (al entrar o al reconectar) llega recargando.
          handlersRef.current.onResync()
        } else {
          setConnection('rechazado')
          setRejection(reply.error)
        }
      })
    })
    socket.on('disconnect', () => setConnection('sin-conexion'))
    socket.on('connect_error', () => setConnection('sin-conexion'))
    socket.on('positions', (records: PositionRecord[]) => {
      const mine = records.filter((record) => record.matchId === matchId)
      if (mine.length > 0) handlersRef.current.onPositions(mine)
    })
    socket.on('status', ({ matchId: from, ...state }: StatusEvent) => {
      if (from === matchId) handlersRef.current.onStatus(state)
    })
    socket.on('simulation', ({ matchId: from, ...state }: SimulationState & { matchId: number }) => {
      if (from === matchId) handlersRef.current.onSimulation(state)
    })

    return () => {
      socket.disconnect()
    }
  }, [matchId])

  return { connection, rejection }
}
