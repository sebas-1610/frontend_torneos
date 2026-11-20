import { ChartNoAxesCombined, CircleAlert, CircleCheck, Clock, Swords, Users } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { findTournamentDevelopment, type TournamentDevelopment } from '../../api/development'
import { findSports, type Sport } from '../../api/sports'
import { findTournaments, type Tournament } from '../../api/tournaments'
import { canOpenPage, RESOURCES, useAccess } from '../../auth/access'
import { StatTile, StatTiles } from '../../components/DetailPanel'
import { PageHeading } from '../../components/PageHeading'
import { TournamentPicker } from '../../components/TournamentPicker'
import { useLoad } from '../../hooks/useLoad'
import { useLoadList } from '../../hooks/useLoadList'
import { revealIfStacked } from '../../utils/reveal'
import { followedTournament } from '../tournaments/tournamentInfo'
import { BackToTournaments, TournamentScreenFallback } from '../tournaments/TournamentScreen'
import { TournamentTabs } from '../tournaments/TournamentTabs'
import { CompetitionStatus } from './CompetitionStatus'
import { developmentSentence, featuredMatch, firstPhaseId } from './developmentInfo'
import { GroupStandingsPanel } from './GroupStandings'
import { KnockoutBracket } from './KnockoutBracket'
import { MatchSummary } from './MatchSummary'
import { PhaseMatches } from './PhaseMatches'
import { PhaseTabs } from './PhaseTabs'
import '../../components/ListPage.css'
import '../../components/DetailPanel.css'
import '../../components/Vivid.css'
import '../matches/Matches.css'
import './Development.css'

// La URL dice qué torneo está abierto (#torneos-desarrollo/{id}): al recargar se abre el mismo.
function showTournamentInUrl(tournamentId: number) {
  window.history.replaceState(null, '', `#torneos-desarrollo/${tournamentId}`)
}

interface DevelopmentPageProps {
  initialTournamentId: number | null // torneo pedido en la URL, ej: desde el ojo de la lista de torneos
}

// Pantalla "Desarrollo del torneo" (HU-GC-08, el mockup): se elige un torneo y se ve cómo va, con sus
// cifras, una pestaña por fase (tablas de posiciones y partidos, o la vista eliminatoria), el estado de
// la competencia y el detalle del partido elegido. Solo se consulta.
export function DevelopmentPage({ initialTournamentId }: DevelopmentPageProps) {
  const { can } = useAccess()
  const tournamentsList = useLoadList(findTournaments)
  const sportsList = useLoadList(findSports, can(RESOURCES.sports, 'LIST')) // solo para el balón del deporte
  const tournaments = tournamentsList.items
  const [tournamentId, setTournamentId] = useState<number | null>(initialTournamentId)
  const tournament = followedTournament(tournaments, tournamentId)

  if (tournamentsList.loadError || tournamentsList.loading || !tournament) {
    return (
      <TournamentScreenFallback
        icon={ChartNoAxesCombined}
        title="Desarrollo del torneo"
        loading={tournamentsList.loading}
        loadError={tournamentsList.loadError}
        onRetry={tournamentsList.retry}
      />
    )
  }

  return (
    // La key vuelve a montar el desarrollo al cambiar de torneo: lo carga desde cero.
    <TournamentDevelopmentView
      key={tournament.id}
      tournament={tournament}
      tournaments={tournaments}
      sports={sportsList.items}
      onChooseTournament={(id) => {
        setTournamentId(id)
        showTournamentInUrl(id)
      }}
    />
  )
}

interface TournamentDevelopmentViewProps {
  tournament: Tournament
  tournaments: Tournament[]
  sports: Sport[]
  onChooseTournament: (tournamentId: number) => void
}

// Carga el desarrollo del torneo (una sola petición) y arma la pantalla con lo que llega.
function TournamentDevelopmentView({ tournament, tournaments, sports, onChooseTournament }: TournamentDevelopmentViewProps) {
  const fetchDevelopment = useCallback(() => findTournamentDevelopment(tournament.id), [tournament.id])
  const { data: development, loading, loadError, retry } = useLoad(fetchDevelopment)

  const finding = loading
    ? 'Cargando el desarrollo del torneo…'
    : loadError || !development
      ? 'No se pudo cargar el desarrollo del torneo.'
      : developmentSentence(development)

  return (
    <div className="page page--vivid">
      <PageHeading icon={ChartNoAxesCombined} title="Desarrollo del torneo" finding={finding}>
        <BackToTournaments tournamentId={tournament.id} />
      </PageHeading>

      <TournamentPicker
        groupBy="status"
        showDates
        tournaments={tournaments}
        tournament={tournament}
        sports={sports}
        onChoose={onChooseTournament}
        footer={development && <TournamentFigures development={development} />}
      />
      <TournamentTabs tournamentId={tournament.id} current="torneos-desarrollo" />

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
      ) : loading || !development ? (
        <section className="panel" aria-busy="true">
          <p className="empty-state">Cargando las fases, las tablas y los partidos…</p>
        </section>
      ) : (
        <DevelopmentBoard development={development} />
      )}
    </div>
  )
}

// Las cifras de la tarjeta del torneo, como en el mockup: equipos, partidos, finalizados y pendientes.
function TournamentFigures({ development }: { development: TournamentDevelopment }) {
  const { summary } = development
  return (
    <div className="dev-figures">
      <StatTiles>
        <StatTile icon={Users} tone="--tone-blue" value={summary.teams} label={summary.teams === 1 ? 'Equipo' : 'Equipos'} />
        <StatTile
          icon={Swords}
          tone="--tone-green"
          value={summary.matches}
          label={summary.matches === 1 ? 'Partido' : 'Partidos'}
        />
        <StatTile
          icon={CircleCheck}
          tone="--tone-teal"
          value={summary.finished}
          label={summary.finished === 1 ? 'Finalizado' : 'Finalizados'}
        />
        <StatTile
          icon={Clock}
          tone="--tone-amber"
          value={summary.pending}
          label={summary.pending === 1 ? 'Pendiente' : 'Pendientes'}
        />
      </StatTiles>
    </div>
  )
}

// Lo que cambia con la fase elegida (a la izquierda) y lo que es de todo el torneo (a la derecha).
function DevelopmentBoard({ development }: { development: TournamentDevelopment }) {
  const { can } = useAccess()
  const { tournament, summary, phases } = development
  const [phaseId, setPhaseId] = useState<number | null>(() => firstPhaseId(development))
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const detailRef = useRef<HTMLElement>(null)

  const phase = phases.find((item) => item.id === phaseId) ?? phases[0] ?? null
  // El elegido, si es de la fase que se mira; si no, el que importa en ella (en juego, último jugado...).
  const selected =
    phase === null ? null : (phase.matches.find((match) => match.id === selectedId) ?? featuredMatch(phase.matches))
  const finals = phases.filter((item) => item.type === 'FINAL')

  function select(matchId: number) {
    setSelectedId(matchId)
    revealIfStacked(() => detailRef.current)
  }

  return (
    <div className="dev-grid">
      <div className="dev-main">
        {phase === null ? (
          <section className="panel">
            <p className="empty-state">
              {tournament.name} todavía no tiene fases.{' '}
              {canOpenPage('torneos-fases', can) ? (
                <a className="text-action" href={`#torneos-fases/${tournament.id}`}>
                  Créalas en Fases y grupos
                </a>
              ) : (
                'Cuando las tenga, aquí verás sus tablas, sus llaves y sus partidos.'
              )}
            </p>
          </section>
        ) : (
          <>
            <PhaseTabs
              phases={phases}
              currentId={phase.id}
              playingId={summary.currentPhase?.id ?? null}
              onChoose={setPhaseId}
            />
            {phase.type === 'GRUPOS' ? (
              <>
                <GroupStandingsPanel phase={phase} />
                <PhaseMatches phase={phase} selectedId={selected?.id ?? null} onSelect={select} />
              </>
            ) : (
              <KnockoutBracket
                phases={finals}
                currentId={phase.id}
                selectedId={selected?.id ?? null}
                onSelect={select}
              />
            )}
          </>
        )}
      </div>

      <aside className="dev-side" aria-label="Resumen del torneo">
        <CompetitionStatus summary={summary} />
        <MatchSummary
          ref={detailRef}
          match={selected}
          tournamentId={tournament.id}
          emptyMessage={
            phase === null
              ? 'Cuando el torneo tenga partidos, aquí verás el detalle del que elijas.'
              : `${phase.name} todavía no tiene partidos.`
          }
        />
      </aside>
    </div>
  )
}
