import { Flag, Pause, Play } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '../../api/client'
import { finishTracking, pauseTracking, startTracking, type TrackingBoard } from '../../api/tracking'
import { ActionAlert, type ActionError } from '../../components/ActionAlert'
import { useConfirm } from '../../hooks/useConfirm'
import { matchTitle } from '../matches/matchInfo'

interface TrackingControlsProps {
  board: TrackingBoard
  onChanged: (board: TrackingBoard, message: string) => void
}

// Lo que maneja el administrador deportivo (permiso "actualizar seguimiento"): iniciar o reanudar, pausar
// y finalizar (HU-GC-09). Quien no tiene el permiso no ve este bloque. Las posiciones no se registran aquí:
// llegan del script que simula el partido.
export function TrackingControls({ board, onChanged }: TrackingControlsProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ActionError | null>(null)
  const [ballName, setBallName] = useState('')
  const { confirm, confirmDialog } = useConfirm()
  const { status } = board.tracking
  const matchId = board.match.id
  const playing = board.match.status === 'EN_JUEGO'

  async function run(action: () => Promise<TrackingBoard>, message: string, failure: string) {
    setBusy(true)
    setError(null)
    try {
      onChanged(await action(), message)
    } catch (err) {
      setError({ title: failure, message: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  async function finish() {
    const confirmed = await confirm({
      title: 'Finalizar el seguimiento',
      message: `El seguimiento de ${matchTitle(board.match)} no se podrá volver a abrir. No se borra nada: el partido, los jugadores, la pelota y las posiciones registradas se conservan.`,
      confirmLabel: 'Finalizar',
      tone: 'neutral', // no borra nada: solo cierra el seguimiento
    })
    if (confirmed) {
      await run(() => finishTracking(matchId), 'Seguimiento finalizado.', 'No se pudo finalizar el seguimiento')
    }
  }

  if (status === 'FINALIZADO') return null

  return (
    <div className="tracking-controls">
      {error && <ActionAlert error={error} onDismiss={() => setError(null)} />}

      {status === 'SIN_INICIAR' && (
        <>
          <label className="login__field">
            <span>Nombre de la pelota (opcional)</span>
            <input
              type="text"
              value={ballName}
              maxLength={60}
              placeholder="Balón del partido"
              disabled={busy || !playing}
              onChange={(e) => setBallName(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="button button--primary"
            disabled={busy || !playing}
            onClick={() =>
              run(
                () => startTracking(matchId, ballName.trim() || null),
                'Seguimiento iniciado.',
                'No se pudo iniciar el seguimiento',
              )
            }
          >
            <Play size={16} aria-hidden="true" />
            {busy ? 'Iniciando…' : 'Iniciar seguimiento'}
          </button>
          {!playing && (
            <p className="tracking-note">Primero inicia el partido: el seguimiento es solo para partidos en juego.</p>
          )}
        </>
      )}

      {status === 'ACTIVO' && (
        <div className="tracking-controls__row">
          <button
            type="button"
            className="button button--outline"
            disabled={busy}
            onClick={() => run(() => pauseTracking(matchId), 'Seguimiento en pausa.', 'No se pudo pausar el seguimiento')}
          >
            <Pause size={16} aria-hidden="true" />
            Pausar
          </button>
          <button type="button" className="button button--text" disabled={busy} onClick={finish}>
            <Flag size={16} aria-hidden="true" />
            Finalizar
          </button>
        </div>
      )}

      {status === 'PAUSADO' && (
        <div className="tracking-controls__row">
          <button
            type="button"
            className="button button--primary"
            disabled={busy || !playing}
            onClick={() =>
              run(() => startTracking(matchId, null), 'Seguimiento reanudado.', 'No se pudo reanudar el seguimiento')
            }
          >
            <Play size={16} aria-hidden="true" />
            {busy ? 'Reanudando…' : 'Reanudar'}
          </button>
          <button type="button" className="button button--text" disabled={busy} onClick={finish}>
            <Flag size={16} aria-hidden="true" />
            Finalizar
          </button>
        </div>
      )}

      {confirmDialog}
    </div>
  )
}
