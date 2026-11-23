import type { CSSProperties } from 'react'
import type { TrackingStatus } from '../../api/tracking'
import type { LiveConnection } from '../../hooks/useTrackingSocket'
import { TRACKING_STATUSES } from './trackingInfo'

// El estado del seguimiento con su color; "Activo" lleva el punto de "en vivo", como "En juego".
export function TrackingStatusTag({ status }: { status: TrackingStatus }) {
  const { label, tone } = TRACKING_STATUSES[status]
  return (
    <span className="tag match-tag" style={{ '--tag': tone } as CSSProperties}>
      {status === 'ACTIVO' && <span className="live-dot" aria-hidden="true" />}
      {label}
    </span>
  )
}

const CONNECTION_TEXT: Record<LiveConnection, string> = {
  conectando: 'Conectando…',
  'en-vivo': 'Recibiendo en vivo',
  'sin-conexion': 'Sin conexión, reintentando…',
  rechazado: 'Sin actualizaciones en vivo',
}

// Si la pizarra está recibiendo los cambios en vivo (el socket).
export function ConnectionNote({ connection, rejection }: { connection: LiveConnection; rejection: string | null }) {
  return (
    <p className={`tracking-connection tracking-connection--${connection}`} role="status">
      <span className="status-dot" aria-hidden="true" />
      <span>
        {CONNECTION_TEXT[connection]}
        {connection === 'rechazado' && rejection ? `: ${rejection}` : ''}
      </span>
    </p>
  )
}
