import { CircleDot, History, Users } from 'lucide-react'
import type { PositionRecord, TrackedBall, TrackedPlayer, TrackedTeam } from '../../api/tracking'
import { PanelHead } from '../../components/PageHeading'
import { TeamMonogram } from '../../components/TeamMonogram'
import { clockOf, formatCoord, fullName, initialsOf, onField } from './trackingInfo'

// Los bloques del panel lateral de la pizarra (HU-GC-09): la pelota, los jugadores de cada equipo y las
// últimas posiciones. Solo muestran lo que reciben.

function Coordinates({ x, y }: { x: number; y: number }) {
  return (
    <span className="tracking-coords num">
      x {formatCoord(x)} · y {formatCoord(y)}
    </span>
  )
}

// La pelota del partido (criterios 6 y 15): se crea al iniciar el seguimiento.
export function BallPanel({ ball }: { ball: TrackedBall | null }) {
  return (
    <section className="panel" aria-labelledby="tracking-ball-title">
      <PanelHead icon={CircleDot} title="Pelota" titleId="tracking-ball-title" />
      {ball === null ? (
        <p className="empty-state">La pelota del partido se crea al iniciar el seguimiento.</p>
      ) : (
        <div className="tracking-ball">
          <span className="tracking-ball__mark" aria-hidden="true" />
          <span className="tracking-ball__name">{ball.name}</span>
          {ball.lastPosition ? (
            <Coordinates x={ball.lastPosition.x} y={ball.lastPosition.y} />
          ) : (
            <span className="dash">Sin posición todavía</span>
          )}
        </div>
      )}
    </section>
  )
}

type Side = 'home' | 'away'

function PlayerRow({ player, side }: { player: TrackedPlayer; side: Side }) {
  const here = player.lastPosition !== null
  return (
    <li className={`tracking-player${here ? '' : ' is-away'}`}>
      <span className={`tracking-chip tracking-chip--${side}`} aria-hidden="true">
        {initialsOf(player)}
      </span>
      <span className="tracking-player__name">
        {fullName(player)}
        {player.position && <span className="tracking-player__role">{player.position}</span>}
      </span>
      {here ? (
        <Coordinates x={player.lastPosition!.x} y={player.lastPosition!.y} />
      ) : (
        <span className="dash" title="Todavía no tiene posición: no aparece en la cancha">
          —<span className="sr-only">sin posición</span>
        </span>
      )}
    </li>
  )
}

// La plantilla del día de un equipo (criterios 3, 5 y 14): los que ya tienen posición están en la cancha;
// los demás salen en la lista, atenuados.
function TeamRoster({ team, side }: { team: TrackedTeam; side: Side }) {
  const here = onField(team).length
  return (
    <div className="tracking-team">
      <p className="tracking-team__head">
        <TeamMonogram team={team.team} size="sm" />
        <span className="tracking-team__name">{team.team.name}</span>
        <span className="tracking-team__count num">
          {here} de {team.players.length} en cancha
        </span>
      </p>
      {team.players.length === 0 ? (
        <p className="empty-state">No tiene jugadores con contrato el día del partido.</p>
      ) : (
        <ul className="tracking-players">
          {team.players.map((player) => (
            <PlayerRow key={player.id} player={player} side={side} />
          ))}
        </ul>
      )}
    </div>
  )
}

export function RosterPanel({ home, away }: { home: TrackedTeam; away: TrackedTeam }) {
  return (
    <section className="panel tracking-roster" aria-labelledby="tracking-roster-title">
      <PanelHead icon={Users} title="Jugadores" titleId="tracking-roster-title" />
      <div className="tracking-roster__teams">
        <TeamRoster team={home} side="home" />
        <TeamRoster team={away} side="away" />
      </div>
    </section>
  )
}

// Las últimas posiciones registradas, de la más nueva a la más vieja ("Últimas actualizaciones").
export function LatestPanel({ latest, players }: { latest: PositionRecord[]; players: Map<number, TrackedPlayer> }) {
  return (
    <section className="panel" aria-labelledby="tracking-latest-title">
      <PanelHead icon={History} title="Últimas actualizaciones" titleId="tracking-latest-title" />
      {latest.length === 0 ? (
        <p className="empty-state">Todavía no se registra ninguna posición.</p>
      ) : (
        <ol className="tracking-latest">
          {latest.map((record) => {
            const player = record.playerId !== null ? players.get(record.playerId) : undefined
            return (
              <li key={record.id} className="tracking-latest__row">
                <span className="tracking-latest__who">
                  {record.ball ? 'Pelota' : player ? fullName(player) : `Jugador ${record.playerId}`}
                </span>
                <Coordinates x={record.x} y={record.y} />
                <time className="tracking-latest__time num" dateTime={record.recordedAt}>
                  {clockOf(record.recordedAt)}
                </time>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
