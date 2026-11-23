import { ArrowLeft, CircleAlert, History, MapPinned, Radar, Users, Waypoints } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { findTrackingBoard, type TrackedPlayer, type TrackingBoard } from '../../api/tracking'
import { canOpenPage, RESOURCES, useAccess } from '../../auth/access'
import { StatTile, StatTiles } from '../../components/DetailPanel'
import { PageHeading, PanelHead } from '../../components/PageHeading'
import { useLoad } from '../../hooks/useLoad'
import { useToast } from '../../hooks/useToast'
import { useTrackingSocket } from '../../hooks/useTrackingSocket'
import { Scoreboard } from '../matches/MatchVisuals'
import { Pitch } from './Pitch'
import { TrackingControls } from './TrackingControls'
import { TrackingReplayView } from './TrackingReplayView'
import { BallPanel, LatestPanel, RosterPanel } from './TrackingSide'
import { ConnectionNote, TrackingStatusTag } from './TrackingVisuals'
import { applyPositions, applyStatus, boardSentence, dateTimeOf, fieldKindOf, onField } from './trackingInfo'
import '../../components/ListPage.css'
import '../../components/DetailPanel.css'
import '../../components/Vivid.css'
import '../matches/Matches.css'
import './Tracking.css'

/*
 * Cuadrícula a 1440 px: barra lateral 231 + regla 1 = 232 · lienzo 1440 − 232 = 1208 · márgenes 29 + 29 ·
 * cancha 789 + gap 16 + panel lateral 344 = 1149 = 1208 − 58 ✓ (la de page__grid). El marcador va arriba a
 * todo el ancho. ≤ 1279 px: el panel lateral baja debajo de la cancha en dos columnas; ≤ 759 px, en una.
 */

interface TrackingPageProps {
  matchId: number // #seguimiento/{matchId}
}

// Pizarra del seguimiento en vivo de un partido (HU-GC-09, el mockup): arriba el marcador, al centro la
// cancha del deporte con los jugadores y la pelota, y al lado el estado, la pelota, los jugadores de cada
// equipo, las cifras y las últimas posiciones. Carga la pizarra por REST y la mantiene al día con el socket.
export function TrackingPage({ matchId }: TrackingPageProps) {
  const { can } = useAccess()
  const canManage = can(RESOURCES.tracking, 'UPDATE')
  const fetchBoard = useCallback(() => findTrackingBoard(matchId), [matchId])
  const { data: board, setData, loading, loadError, reload, retry } = useLoad(fetchBoard)
  const { showToast, toast } = useToast()

  const { connection, rejection } = useTrackingSocket(matchId, {
    onPositions: (records) => setData((current) => current && applyPositions(current, records)),
    onStatus: (state) => {
      setData((current) => current && applyStatus(current, state))
      // Al finalizar por el resultado o la cancelación, el marcador o el estado del partido cambiaron.
      if (state.status === 'FINALIZADO') reload()
    },
    onResync: reload,
  })

  const back = canOpenPage('en-vivo', can) ? (
    <a className="button button--outline" href="#en-vivo">
      <ArrowLeft size={18} aria-hidden="true" />
      Volver a En vivo
    </a>
  ) : (
    <a className="button button--outline" href={`#partidos/${matchId}`}>
      <ArrowLeft size={18} aria-hidden="true" />
      Volver a Partidos
    </a>
  )

  if (loadError || loading || !board) {
    return (
      <div className="page page--vivid tracking-page">
        <PageHeading
          icon={Radar}
          title="Seguimiento del partido"
          finding={loadError ? 'No se pudo cargar la pizarra del partido.' : 'Cargando la pizarra…'}
        >
          {back}
        </PageHeading>
        {loadError ? (
          <section className="panel">
            <div className="inline-error" role="alert">
              <CircleAlert size={16} aria-hidden="true" />
              <span>{loadError}</span>
              <button type="button" className="text-action" onClick={retry}>
                Reintentar
              </button>
            </div>
          </section>
        ) : (
          <BoardSkeleton />
        )}
      </div>
    )
  }

  return (
    <div className="page page--vivid tracking-page">
      <PageHeading icon={Radar} title="Seguimiento del partido" finding={boardSentence(board)}>
        {back}
      </PageHeading>

      {/* El marcador trae su propia tarjeta (la misma del detalle de un partido): va sin panel. */}
      <section className="tracking-score" aria-label="Marcador">
        <Scoreboard match={board.match} />
      </section>

      <div className="page__grid">
        <FieldPanel board={board} canManage={canManage} />

        <aside className="rail" aria-label="Detalle del seguimiento">
          <section className="panel" aria-labelledby="tracking-status-title">
            <PanelHead icon={Radar} title="Seguimiento" titleId="tracking-status-title" />
            <div className="tracking-status">
              <TrackingStatusTag status={board.tracking.status} />
              {board.tracking.status !== 'FINALIZADO' && <ConnectionNote connection={connection} rejection={rejection} />}
            </div>
            <dl className="facts">
              <div>
                <dt>Inicio</dt>
                <dd className="num">
                  {board.tracking.startedAt ? dateTimeOf(board.tracking.startedAt) : <span className="dash">—</span>}
                </dd>
              </div>
              <div>
                <dt>Fin</dt>
                <dd className="num">
                  {board.tracking.finishedAt ? dateTimeOf(board.tracking.finishedAt) : <span className="dash">—</span>}
                </dd>
              </div>
            </dl>
            {canManage && (
              <TrackingControls
                board={board}
                onChanged={(updated, message) => {
                  setData(updated)
                  showToast(message)
                }}
              />
            )}
            {board.tracking.status === 'FINALIZADO' && (
              <p className="tracking-note">
                El seguimiento finalizó: el partido, los jugadores, la pelota y las posiciones se conservan.
              </p>
            )}
          </section>

          <TrackingFigures board={board} />
          <BallPanel ball={board.ball} />
          <LatestUpdates board={board} />
          <RosterPanel home={board.home} away={board.away} />
        </aside>
      </div>

      {toast}
    </div>
  )
}

// La cancha con los jugadores que ya tienen posición y la pelota (criterios 2 a 6, 9 y 10). Con "Ver
// recorrido" la misma cancha repite todo el seguimiento guardado (criterio 13).
function FieldPanel({ board, canManage }: { board: TrackingBoard; canManage: boolean }) {
  const [replaying, setReplaying] = useState(false)
  const home = onField(board.home)
  const away = onField(board.away)
  const nobody = board.home.players.length + board.away.players.length === 0
  const empty = home.length + away.length === 0 && !board.ball?.lastPosition
  const kind = fieldKindOf(board.sport)
  const sportName = board.sport.parentName ? `${board.sport.name} (${board.sport.parentName})` : board.sport.name

  return (
    <section className="panel tracking-field" aria-labelledby="tracking-field-title">
      <PanelHead
        icon={replaying ? History : MapPinned}
        title={replaying ? 'Recorrido' : 'Pizarra'}
        titleId="tracking-field-title"
        count={sportName}
        action={
          replaying ? (
            <button type="button" className="button button--outline" onClick={() => setReplaying(false)}>
              <Radar size={16} aria-hidden="true" />
              {board.tracking.status === 'FINALIZADO' ? 'Volver a la pizarra' : 'Volver al vivo'}
            </button>
          ) : (
            board.totals.records > 0 && (
              <button type="button" className="button button--outline" onClick={() => setReplaying(true)}>
                <History size={16} aria-hidden="true" />
                Ver recorrido
              </button>
            )
          )
        }
      />
      {replaying ? (
        <TrackingReplayView board={board} kind={kind} />
      ) : (
        <div className="tracking-field__board">
          <Pitch kind={kind} home={home} away={away} ball={board.ball?.lastPosition ?? null} />
        </div>
      )}
      <p className="tracking-legend">
        <span className="tracking-legend__team">
          <span className="tracking-chip tracking-chip--home" aria-hidden="true" />
          {board.home.team.name} <span className="tracking-legend__role">local, a la izquierda</span>
        </span>
        <span className="tracking-legend__team">
          <span className="tracking-chip tracking-chip--away" aria-hidden="true" />
          {board.away.team.name} <span className="tracking-legend__role">visitante, a la derecha</span>
        </span>
        <span className="tracking-legend__team">
          <span className="tracking-ball__mark" aria-hidden="true" />
          Pelota
        </span>
      </p>
      {replaying ? null : nobody ? (
        <p className="empty-state">Ninguno de los dos equipos tiene jugadores con contrato el día del partido.</p>
      ) : (
        empty && (
          <p className="empty-state">
            {board.tracking.status === 'SIN_INICIAR'
              ? 'Los jugadores aparecen en la cancha cuando el seguimiento se inicia y llega su primera posición.'
              : 'Los jugadores aparecen en la cancha cuando llega su primera posición.'}
            {canManage && board.tracking.status === 'ACTIVO' && (
              <>
                {' '}
                Las posiciones las envía el simulador:{' '}
                <code className="tracking-code">
                  node tools/simulador-seguimiento/simular.mjs --partido={board.match.id}
                </code>
              </>
            )}
          </p>
        )
      )}
    </section>
  )
}

// Las cifras del seguimiento: cuántas posiciones van y cuántos jugadores están en la cancha.
function TrackingFigures({ board }: { board: TrackingBoard }) {
  const total = board.home.players.length + board.away.players.length
  return (
    <section className="panel" aria-labelledby="tracking-figures-title">
      <PanelHead icon={Waypoints} title="Contadores" titleId="tracking-figures-title" />
      <StatTiles>
        <StatTile
          icon={Waypoints}
          tone="--tone-blue"
          value={board.totals.records}
          label={board.totals.records === 1 ? 'Posición registrada' : 'Posiciones registradas'}
        />
        <StatTile
          icon={Users}
          tone="--tone-green"
          value={board.totals.playersTracked}
          label={`En cancha de ${total} ${total === 1 ? 'jugador' : 'jugadores'}`}
        />
      </StatTiles>
    </section>
  )
}

function LatestUpdates({ board }: { board: TrackingBoard }) {
  const players = useMemo(() => {
    const byId = new Map<number, TrackedPlayer>()
    for (const player of [...board.home.players, ...board.away.players]) byId.set(player.id, player)
    return byId
  }, [board.home.players, board.away.players])
  return <LatestPanel latest={board.latest} players={players} />
}

// Mientras carga: la estructura final en gris (marcador, cancha y panel lateral).
function BoardSkeleton() {
  return (
    <div aria-busy="true">
      <section className="tracking-score">
        <span className="tracking-sk" style={{ height: 180 }} />
      </section>
      <div className="page__grid tracking-skeleton">
        <section className="panel">
          <span className="tracking-sk tracking-skeleton__field" />
        </section>
        <aside className="rail">
          <section className="panel">
            <span className="tracking-sk" style={{ height: 140 }} />
          </section>
          <section className="panel">
            <span className="tracking-sk" style={{ height: 220 }} />
          </section>
        </aside>
      </div>
      <p className="sr-only">Cargando la pizarra…</p>
    </div>
  )
}
