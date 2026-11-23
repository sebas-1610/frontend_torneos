import { Settings2, Swords, Trophy } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { findMatches, type Match, type MatchStatus } from '../../api/matches'
import { canOpenPage, RESOURCES, useAccess } from '../../auth/access'
import { ListPanel, ListToolbar } from '../../components/ListView'
import { PageHeading } from '../../components/PageHeading'
import { useLoadList } from '../../hooks/useLoadList'
import { useSort } from '../../hooks/useSort'
import { revealIfStacked } from '../../utils/reveal'
import { normalize } from '../roles/labels'
import type { BettingAbilities } from './MatchBetting'
import { MatchDetail, type MatchAbilities } from './MatchDetail'
import { allMatchesSentence, STATUS_ORDER } from './matchInfo'
import type { ScoreAbilities } from './MatchScores'
import { MatchesTable, type MatchSortKey } from './MatchesTable'
import { MatchStatusFilter } from './MatchStatusFilter'
import type { TicketingAbilities } from './MatchTicketing'
import '../../components/ListPage.css'
import '../../components/DetailPanel.css'
import '../../components/Vivid.css'
import './Matches.css'

// Aquí solo se consulta: las acciones (programar, editar, iniciar, resultado, cuotas, venta) están en la
// pantalla de cada torneo, a la que lleva "Gestionar en su torneo".
const NO_ACTIONS: MatchAbilities = { start: false, cancel: false, edit: false, remove: false, result: false }
const ignore = () => {}

// Qué se compara al ordenar por cada columna (useSort). "AAAA-MM-DDTHH:mm" ordena bien como texto.
const SORT_VALUES: Record<MatchSortKey, (match: Match) => string | number | null> = {
  date: (match) => match.scheduledAt,
  phase: (match) =>
    `${match.tournament.name} ${String(match.phase.order).padStart(3, '0')} ${match.group?.name ?? ''} ${String(match.bracketPosition ?? 0).padStart(3, '0')}`,
  status: (match) => STATUS_ORDER.indexOf(match.status),
}

// La URL recuerda el partido elegido (#partidos/12): al volver de su torneo sigue elegido.
function showMatchInUrl(matchId: number) {
  window.history.replaceState(null, '', `#partidos/${matchId}`)
}

interface AllMatchesPageProps {
  initialMatchId: number | null // partido pedido en la URL (#partidos/12)
}

// Pantalla "Partidos" del menú: los partidos de todos los torneos, por fecha, con búsqueda (equipo o
// torneo) y filtros de torneo y estado. A la derecha, el elegido con su marcador, sus anotaciones, sus
// cuotas y su venta de entradas, solo para consultar.
export function AllMatchesPage({ initialMatchId }: AllMatchesPageProps) {
  const { can } = useAccess()
  const { items: matches, loading, loadError, retry } = useLoadList(findMatches)

  const scoreAbilities: ScoreAbilities = {
    list: can(RESOURCES.scores, 'LIST'),
    create: false,
    update: false,
    remove: false,
  }
  const bettingAbilities: BettingAbilities = { setOdds: false, listBets: can(RESOURCES.matchBets, 'LIST') }
  const ticketingAbilities: TicketingAbilities = {
    view: can(RESOURCES.ticketing, 'VIEW'),
    configure: false,
    listTickets: can(RESOURCES.matchTickets, 'LIST'),
  }
  const canManage = canOpenPage('torneos-partidos', can)
  const canOpenVenues = canOpenPage('escenarios', can)

  const [query, setQuery] = useState('')
  const [tournamentId, setTournamentId] = useState<number | null>(null)
  const [status, setStatus] = useState<MatchStatus | ''>('')
  const [selectedId, setSelectedId] = useState<number | null>(initialMatchId)
  const detailRef = useRef<HTMLElement>(null)

  // Los torneos del filtro: los que tienen partidos, por nombre.
  const tournamentOptions = useMemo(() => {
    const byId = new Map(matches.map((match) => [match.tournament.id, match.tournament]))
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [matches])

  // El backend no filtra: la búsqueda (por equipo o torneo, sin tildes) y los filtros se aplican aquí.
  const filtered = useMemo(() => {
    const text = normalize(query.trim())
    return matches.filter(
      (match) =>
        (tournamentId === null || match.tournament.id === tournamentId) &&
        (status === '' || match.status === status) &&
        (!text ||
          normalize(match.homeTeam.name).includes(text) ||
          normalize(match.awayTeam.name).includes(text) ||
          normalize(match.tournament.name).includes(text)),
    )
  }, [matches, query, tournamentId, status])
  const { sorted: visible, sort, toggleSort } = useSort(filtered, SORT_VALUES)

  // El elegido; si no hay, el que importa hoy: el primero en juego, si no el próximo programado.
  const selected =
    matches.find((match) => match.id === selectedId) ??
    visible.find((match) => match.status === 'EN_JUEGO') ??
    visible.find((match) => match.status === 'PROGRAMADO') ??
    visible[0] ??
    null

  const finding = loading
    ? 'Cargando partidos…'
    : loadError
      ? 'No se pudieron cargar los partidos.'
      : allMatchesSentence(matches)

  function select(matchId: number, reveal: boolean) {
    setSelectedId(matchId)
    showMatchInUrl(matchId)
    if (reveal) revealIfStacked(() => detailRef.current)
  }

  return (
    <div className="page page--vivid">
      <PageHeading icon={Swords} title="Partidos" finding={finding} />

      <ListToolbar query={query} onQueryChange={setQuery} placeholder="Buscar por equipo o torneo">
        <select
          aria-label="Filtrar por torneo"
          value={tournamentId ?? ''}
          onChange={(e) => setTournamentId(e.target.value === '' ? null : Number(e.target.value))}
        >
          <option value="">Todos los torneos</option>
          {tournamentOptions.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>
              {tournament.name}
            </option>
          ))}
        </select>
        <MatchStatusFilter value={status} onChange={setStatus} />
      </ListToolbar>

      <div className="page__grid">
        <ListPanel
          title="Todos los partidos"
          titleId="all-matches-title"
          icon={Swords}
          noun={['partido', 'partidos']}
          total={matches.length}
          shown={visible.length}
          loading={loading}
          loadError={loadError}
          onRetry={retry}
          emptyMessage={
            visible.length > 0
              ? null
              : matches.length > 0
                ? 'Ningún partido coincide con la búsqueda o los filtros.'
                : canManage
                  ? 'Todavía no hay partidos. Se programan en la pantalla Partidos de cada torneo (Torneos › un torneo › Partidos).'
                  : 'Todavía no hay partidos.'
          }
        >
          <MatchesTable
            matches={visible}
            selectedId={selected?.id ?? null}
            sort={sort}
            onSort={toggleSort}
            onSelect={select}
            busyId={null}
            showTournament
            watchHref={canOpenPage('seguimiento', can) ? (match) => `#seguimiento/${match.id}` : undefined}
          />
        </ListPanel>

        <MatchDetail
          ref={detailRef}
          match={loading || loadError ? null : selected}
          emptyMessage={
            loading
              ? 'Cargando partidos…'
              : loadError
                ? 'Cuando la lista cargue, aquí verás el partido elegido.'
                : matches.length === 0
                  ? 'Cuando haya partidos, aquí verás su marcador, su estado y sus anotaciones.'
                  : 'Ningún partido coincide con la búsqueda o los filtros.'
          }
          busy={false}
          error={null}
          onDismissError={ignore}
          abilities={NO_ACTIONS}
          scoreAbilities={scoreAbilities}
          bettingAbilities={bettingAbilities}
          ticketingAbilities={ticketingAbilities}
          canOpenVenues={canOpenVenues}
          onStart={ignore}
          onCancel={ignore}
          onEdit={ignore}
          onDelete={ignore}
          onResult={ignore}
          onScoresChanged={ignore}
          onMatchSaved={ignore}
          onToast={ignore}
          footer={
            selected && (
              <div className="detail__actions match-open">
                <p className="match-open__tournament">
                  <Trophy size={14} aria-hidden="true" />
                  <span>
                    Torneo <strong>{selected.tournament.name}</strong>
                  </span>
                </p>
                {canManage && (
                  <a className="button button--primary" href={`#torneos-partidos/${selected.tournament.id}/${selected.id}`}>
                    <Settings2 size={16} aria-hidden="true" />
                    Gestionar en su torneo
                  </a>
                )}
              </div>
            )
          }
        />
      </div>
    </div>
  )
}
