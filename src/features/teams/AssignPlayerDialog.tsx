import { UserPlus, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '../../api/client'
import type { Player } from '../../api/players'
import { assignPlayer, effectiveEnd, type Contract } from '../../api/teamPlayers'
import type { Team } from '../../api/teams'
import { PlayerAvatar } from '../../components/PlayerAvatar'
import { PlayerSearch } from '../../components/PlayerSearch'
import { addYears, formatDateShort, today } from '../../utils/dates'
import { fullNameOf } from '../players/playerName'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'

interface AssignPlayerDialogProps {
  team: Team
  players: Player[] // los jugadores activos, entre los que se elige
  contracts: Contract[] // los del equipo, para avisar antes de enviar si las fechas se cruzan
  onClose: () => void
  onSaved: (contract: Contract) => void
}

// Ventana "Asignar jugador al equipo" (HU-GD-05): el jugador y las fechas de su contrato. Un contrato
// no se edita después: si cambia, se retira y se crea otro.
export function AssignPlayerDialog({ team, players, contracts, onClose, onSaved }: AssignPlayerDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [player, setPlayer] = useState<Player | null>(null)
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(() => addYears(today(), 1))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  // La misma regla del backend: el jugador no puede tener con este equipo dos contratos que se crucen.
  // Uno cancelado antes de empezar (lo retiraron antes de su inicio) no ocupa ningún día.
  const datesOk = startDate !== '' && endDate !== '' && endDate >= startDate
  const clash =
    player && datesOk
      ? contracts.find((contract) => {
          const end = effectiveEnd(contract)
          return (
            contract.player.id === player.id &&
            end >= contract.startDate &&
            startDate <= end &&
            endDate >= contract.startDate
          )
        })
      : undefined

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!player) return
    setError(null)
    setLoading(true)
    try {
      onSaved(await assignPlayer({ teamId: team.id, playerId: player.id, startDate, endDate }))
    } catch (err) {
      setError(errorMessage(err)) // ej: 409 si otra persona lo asignó mientras tanto
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="form-dialog form-dialog--wide" onClose={onClose} aria-labelledby="assign-title">
      <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
        <div className="form-dialog__head">
          <span className="panel-head__icon" aria-hidden="true">
            <UserPlus size={16} />
          </span>
          <h2 id="assign-title" className="panel__title">
            Asignar jugador a {team.name}
          </h2>
          <button
            type="button"
            className="icon-button icon-button--small"
            aria-label="Cerrar"
            onClick={() => dialogRef.current?.close()}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="login__field">
          <span>Jugador</span>
          {player ? (
            <div className="picked">
              <PlayerAvatar player={player} />
              <span className="cell-lines">
                <span className="data-table__strong">{fullNameOf(player)}</span>
                <span className="cell-lines__detail">
                  {player.documentType} {player.documentNumber}
                  {player.currentTeams.length > 0 &&
                    ` · Hoy juega en ${player.currentTeams.map((item) => item.name).join(', ')}`}
                </span>
              </span>
              <button type="button" className="button button--text" onClick={() => setPlayer(null)}>
                Cambiar
              </button>
            </div>
          ) : (
            <PlayerSearch
              inline
              players={players}
              label="Buscar por nombre o documento"
              emptyText="No hay jugadores activos. Regístralos en la pantalla Jugadores."
              onChoose={setPlayer}
            />
          )}
        </div>

        <div className="form-dialog__row">
          <label className="login__field">
            <span>Fecha de inicio del contrato</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="login__field">
            <span>Fecha de fin del contrato</span>
            <input type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>
        {startDate !== '' && endDate !== '' && endDate < startDate && (
          <p className="field-hint">La fecha de fin no puede ser anterior a la de inicio.</p>
        )}

        {clash && player ? (
          <p className="login__error" role="alert">
            {fullNameOf(player)} ya tiene con {team.name} un contrato del {formatDateShort(clash.startDate)} al{' '}
            {formatDateShort(effectiveEnd(clash))}. Elige fechas que no se crucen o retíralo primero.
          </p>
        ) : (
          error && (
            <p className="login__error" role="alert">
              {error}
            </p>
          )
        )}

        <div className="form-dialog__actions">
          <button type="button" className="button button--outline" onClick={() => dialogRef.current?.close()}>
            Cancelar
          </button>
          <button
            type="submit"
            className="button button--primary"
            disabled={loading || !player || !datesOk || clash !== undefined}
          >
            {loading ? 'Asignando…' : 'Asignar jugador'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
