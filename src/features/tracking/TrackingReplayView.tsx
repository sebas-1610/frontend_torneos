import { CircleAlert, Pause, Play } from 'lucide-react'
import type { TrackedPlayer, TrackingBoard } from '../../api/tracking'
import { Pitch } from './Pitch'
import { REPLAY_SPEEDS, frameDelay } from './replay'
import { clockOf, formatCount, type FieldKind } from './trackingInfo'
import { useTrackingReplay } from './useTrackingReplay'

interface TrackingReplayViewProps {
  board: TrackingBoard
  kind: FieldKind
}

// "Ver recorrido" (HU-GC-09, criterio 13): repite en la cancha todo el seguimiento guardado, con
// reproducir/pausar, una barra para ir a cualquier momento y la velocidad. Se monta al abrir el recorrido
// (ahí descarga el historial) y se desmonta al volver al vivo.
export function TrackingReplayView({ board, kind }: TrackingReplayViewProps) {
  const replay = useTrackingReplay(board.match.id)
  const { frames, index } = replay
  const frame = frames[index]

  if (replay.error) {
    return (
      <div className="inline-error" role="alert">
        <CircleAlert size={16} aria-hidden="true" />
        <span>{replay.error}</span>
        <button type="button" className="text-action" onClick={replay.retry}>
          Reintentar
        </button>
      </div>
    )
  }

  if (replay.loading || !frame) {
    return (
      <div className="tracking-replay__loading" aria-busy="true">
        <span className="tracking-sk tracking-skeleton__field" />
        <p className="empty-state" role="status">
          {replay.loading
            ? `Cargando el recorrido… ${formatCount(replay.loaded)} posiciones`
            : 'Este seguimiento todavía no tiene posiciones registradas.'}
        </p>
      </div>
    )
  }

  // Los jugadores de cada equipo en el lugar que tenían en este momento (los que aún no llegaban, fuera).
  const placed = (players: TrackedPlayer[]) =>
    players
      .filter((player) => frame.players[player.id])
      .map((player) => ({ ...player, lastPosition: frame.players[player.id] }))

  const last = frames.length - 1
  // Cada ficha tarda en llegar lo mismo que dura el cuadro: el movimiento se ve continuo a cualquier velocidad.
  // En pausa (o al mover la barra) llega casi de inmediato.
  const moveMs = replay.playing ? frameDelay(frames, index, replay.speed) || 150 : 150

  return (
    <div className="tracking-replay">
      <div className="tracking-field__board">
        <Pitch kind={kind} home={placed(board.home.players)} away={placed(board.away.players)} ball={frame.ball} moveMs={moveMs} />
      </div>

      <div className="tracking-replay__bar">
        <button
          type="button"
          className="icon-button"
          aria-label={replay.playing ? 'Pausar el recorrido' : 'Reproducir el recorrido'}
          onClick={replay.playing ? replay.pause : replay.play}
        >
          {replay.playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
        </button>
        <span className="tracking-replay__time num" aria-live="off">
          {clockOf(frame.at)}
        </span>
        <input
          className="tracking-replay__slider"
          type="range"
          min={0}
          max={last}
          value={index}
          aria-label="Momento del recorrido"
          aria-valuetext={`${clockOf(frame.at)}, cuadro ${index + 1} de ${frames.length}`}
          onChange={(e) => {
            replay.pause()
            replay.seek(Number(e.target.value))
          }}
        />
        <span className="tracking-replay__count num">
          {index + 1} / {frames.length}
        </span>
        <div className="tracking-replay__speeds" role="group" aria-label="Velocidad">
          {REPLAY_SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              className={`tracking-speed num${replay.speed === speed ? ' is-active' : ''}`}
              aria-pressed={replay.speed === speed}
              onClick={() => replay.setSpeed(speed)}
            >
              {speed}×
            </button>
          ))}
        </div>
      </div>
      <p className="tracking-note">
        Recorrido guardado del {clockOf(frames[0].at)} al {clockOf(frames[last].at)}: {formatCount(frames.length)}{' '}
        {frames.length === 1 ? 'momento' : 'momentos'}. Lo que llegue en vivo mientras lo ves no se incluye.
      </p>
    </div>
  )
}
