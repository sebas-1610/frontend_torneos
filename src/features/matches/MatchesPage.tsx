import { Plus, Swords } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { errorMessage } from '../../api/client'
import {
  cancelMatch,
  deleteMatch,
  findMatchesByTournament,
  startMatch,
  type Match,
  type MatchStatus,
} from '../../api/matches'
import { findPhasesByTournament } from '../../api/phases'
import { findSports, type Sport } from '../../api/sports'
import { findTournaments, type Tournament } from '../../api/tournaments'
import { RESOURCES, useAccess } from '../../auth/access'
import type { ActionError } from '../../components/ActionAlert'
import { SubjectVisual } from '../../components/ConfirmDialog'
import { ListPanel, ListToolbar, ToolbarButton } from '../../components/ListView'
import { PageHeading } from '../../components/PageHeading'
import { TeamMonogram } from '../../components/TeamMonogram'
import { TournamentPicker } from '../../components/TournamentPicker'
import { useConfirm } from '../../hooks/useConfirm'
import { useLoadList } from '../../hooks/useLoadList'
import { useSort } from '../../hooks/useSort'
import { useToast } from '../../hooks/useToast'
import { revealIfStacked } from '../../utils/reveal'
import { normalize } from '../roles/labels'
import { followedTournament } from '../tournaments/tournamentInfo'
import { BackToTournaments, TournamentScreenFallback } from '../tournaments/TournamentScreen'
import { TournamentTabs } from '../tournaments/TournamentTabs'
import { MatchDetail, type MatchAbilities } from './MatchDetail'
import { MatchFormDialog } from './MatchFormDialog'
import { matchesSentence, matchPlace, matchTitle, matchWhen, STATUS_ORDER } from './matchInfo'
import type { ScoreAbilities } from './MatchScores'
import { MatchesTable, type MatchSortKey } from './MatchesTable'
import { ResultDialog } from './ResultDialog'
import '../../components/ListPage.css'
import '../../components/DetailPanel.css'
import '../../components/Vivid.css'
import './Matches.css'

// La URL dice qué torneo está abierto (#torneos-partidos/{id}): al recargar se abre el mismo.
function showTournamentInUrl(tournamentId: number) {
  window.history.replaceState(null, '', `#torneos-partidos/${tournamentId}`)
}

interface MatchesPageProps {
  initialTournamentId: number | null // torneo pedido en la URL, por ejemplo desde su tarjeta en Torneos
  initialMatchId: number | null // partido pedido en la URL (#torneos-partidos/5/12), ej: desde Desarrollo
}

// Pantalla "Partidos" (HU-GC-06 y 07): se elige un torneo; la tabla muestra sus partidos con filtros de
// fase, grupo y estado; a la derecha, el partido elegido con su marcador, lo que se puede hacer según su
// estado y sus anotaciones.
export function MatchesPage({ initialTournamentId, initialMatchId }: MatchesPageProps) {
  const { can } = useAccess()
  const tournamentsList = useLoadList(findTournaments)
  const sportsList = useLoadList(findSports, can(RESOURCES.sports, 'LIST')) // solo para el balón del deporte
  const tournaments = tournamentsList.items
  const [tournamentId, setTournamentId] = useState<number | null>(initialTournamentId)

  const tournament = followedTournament(tournaments, tournamentId)

  if (tournamentsList.loadError || tournamentsList.loading || !tournament) {
    return (
      <TournamentScreenFallback
        icon={Swords}
        title="Partidos"
        loading={tournamentsList.loading}
        loadError={tournamentsList.loadError}
        onRetry={tournamentsList.retry}
      />
    )
  }

  return (
    // La key vuelve a montar los partidos al cambiar de torneo: los carga desde cero.
    <TournamentMatches
      key={tournament.id}
      tournament={tournament}
      tournaments={tournaments}
      sports={sportsList.items}
      initialMatchId={tournament.id === initialTournamentId ? initialMatchId : null}
      onChooseTournament={(id) => {
        setTournamentId(id)
        showTournamentInUrl(id)
      }}
    />
  )
}

// Qué se compara al ordenar por cada columna (useSort). "AAAA-MM-DDTHH:mm" ordena bien como texto.
const SORT_VALUES: Record<MatchSortKey, (match: Match) => string | number | null> = {
  date: (match) => match.scheduledAt,
  phase: (match) => `${String(match.phase.order).padStart(3, '0')} ${match.group?.name ?? ''} ${String(match.bracketPosition ?? 0).padStart(3, '0')}`,
  status: (match) => STATUS_ORDER.indexOf(match.status),
}

// Como los devuelve el backend: por fecha, luego por llave.
function byDate(a: Match, b: Match): number {
  return (
    a.scheduledAt.localeCompare(b.scheduledAt) || (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0) || a.id - b.id
  )
}

interface TournamentMatchesProps {
  tournament: Tournament
  tournaments: Tournament[]
  sports: Sport[]
  initialMatchId: number | null // el que se muestra primero, si es de este torneo
  onChooseTournament: (tournamentId: number) => void
}

// Carga los partidos y las fases del torneo, decide qué puede hacer la sesión y maneja las acciones
// sobre los partidos. Las anotaciones las maneja MatchScores, dentro del detalle.
function TournamentMatches({
  tournament,
  tournaments,
  sports,
  initialMatchId,
  onChooseTournament,
}: TournamentMatchesProps) {
  const { can } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const { showToast, toast } = useToast()

  // El formulario arma las listas de equipos con los grupos y los inscritos.
  const canFillForm = can(RESOURCES.groups, 'LIST') && can(RESOURCES.registrations, 'LIST')
  const canListPhases = can(RESOURCES.phases, 'LIST')
  // Un torneo desactivado no recibe partidos nuevos (el backend responde 400).
  const canCreate = can(RESOURCES.matches, 'CREATE') && canListPhases && canFillForm && tournament.active
  const abilities: MatchAbilities = {
    start: can(RESOURCES.matches, 'UPDATE'),
    cancel: can(RESOURCES.matches, 'UPDATE'),
    edit: can(RESOURCES.matches, 'UPDATE') && canListPhases && canFillForm,
    remove: can(RESOURCES.matches, 'DELETE'),
    result: can(RESOURCES.results, 'UPDATE'),
  }
  const canPickPlayers = can(RESOURCES.contracts, 'LIST')
  const scoreAbilities: ScoreAbilities = {
    list: can(RESOURCES.scores, 'LIST'),
    create: can(RESOURCES.scores, 'CREATE') && canPickPlayers,
    update: can(RESOURCES.scores, 'UPDATE') && canPickPlayers,
    remove: can(RESOURCES.scores, 'DELETE'),
  }

  const fetchMatches = useCallback(() => findMatchesByTournament(tournament.id), [tournament.id])
  const { items: matches, setItems, loading, loadError, reload, retry } = useLoadList(fetchMatches)
  const fetchPhases = useCallback(() => findPhasesByTournament(tournament.id), [tournament.id])
  const phasesList = useLoadList(fetchPhases, canListPhases)

  const [query, setQuery] = useState('')
  const [phaseId, setPhaseId] = useState<number | null>(null)
  const [groupId, setGroupId] = useState<number | null>(null)
  const [status, setStatus] = useState<MatchStatus | ''>('')
  const [selectedId, setSelectedId] = useState<number | null>(initialMatchId)
  const [editing, setEditing] = useState<Match | 'new' | null>(null)
  const [resulting, setResulting] = useState<Match | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<ActionError | null>(null)
  const detailRef = useRef<HTMLElement>(null)

  // El partido pedido en la URL: si el detalle está debajo de la tabla, se baja hasta él una vez.
  const revealedRef = useRef(false)
  useEffect(() => {
    if (loading || initialMatchId === null || revealedRef.current) return
    revealedRef.current = true
    revealIfStacked(() => detailRef.current)
  }, [loading, initialMatchId])

  // Las fases del filtro: las del torneo; sin permiso para listarlas, las que tienen partidos.
  const phaseOptions = useMemo(() => {
    if (canListPhases && phasesList.items.length > 0) return phasesList.items
    const byId = new Map(matches.map((match) => [match.phase.id, match.phase]))
    return [...byId.values()].sort((a, b) => a.order - b.order)
  }, [canListPhases, phasesList.items, matches])
  const filterPhase = phaseOptions.find((phase) => phase.id === phaseId) ?? null
  // Los grupos del filtro: los de los partidos de la fase de grupos elegida.
  const groupOptions = useMemo(() => {
    if (filterPhase?.type !== 'GRUPOS') return []
    const byId = new Map(
      matches.flatMap((match) =>
        match.phase.id === filterPhase.id && match.group ? [[match.group.id, match.group] as const] : [],
      ),
    )
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [filterPhase, matches])

  // El backend no filtra: la búsqueda (por equipo, sin tildes) y los filtros se aplican aquí.
  const filtered = useMemo(() => {
    const text = normalize(query.trim())
    return matches.filter(
      (match) =>
        (phaseId === null || match.phase.id === phaseId) &&
        (groupId === null || match.group?.id === groupId) &&
        (status === '' || match.status === status) &&
        (!text || normalize(match.homeTeam.name).includes(text) || normalize(match.awayTeam.name).includes(text)),
    )
  }, [matches, query, phaseId, groupId, status])
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
      : matchesSentence(tournament.name, matches)

  function select(matchId: number, reveal: boolean) {
    if (matchId !== selected?.id) setActionError(null)
    setSelectedId(matchId)
    if (reveal) revealIfStacked(() => detailRef.current)
  }

  function upsert(saved: Match) {
    setItems((list) => [...list.filter((match) => match.id !== saved.id), saved].sort(byDate))
  }

  // La tira de la confirmación: el partido con su lugar en el torneo y su fecha.
  const subjectOf = (match: Match) => {
    const when = matchWhen(match.scheduledAt)
    return (
      <SubjectVisual
        visual={<TeamMonogram team={match.homeTeam} size="sm" />}
        name={matchTitle(match)}
        detail={`${matchPlace(match)} · ${when.date} ${when.time}`}
      />
    )
  }

  // Corre una acción sobre un partido: lo marca ocupado y, si el backend la rechaza, lo dice en el detalle.
  async function run(match: Match, failTitle: string, action: () => Promise<void>) {
    setBusyId(match.id)
    setActionError(null)
    setSelectedId(match.id)
    try {
      await action()
    } catch (err) {
      setActionError({ title: failTitle, message: errorMessage(err) })
      reload()
    } finally {
      setBusyId(null)
    }
  }

  async function start(match: Match) {
    const confirmed = await confirm({
      title: `¿Iniciar ${matchTitle(match)}?`,
      message: 'Desde que empieza ya no se puede editar, y se pueden registrar sus anotaciones.',
      confirmLabel: 'Iniciar partido',
      tone: 'neutral',
      subject: subjectOf(match),
    })
    if (!confirmed) return
    await run(match, `No se pudo iniciar ${matchTitle(match)}`, async () => {
      upsert(await startMatch(match.id))
      showToast(`${matchTitle(match)} está en juego.`)
    })
  }

  async function cancel(match: Match) {
    const confirmed = await confirm({
      title: `¿Cancelar ${matchTitle(match)}?`,
      message:
        'El partido queda cancelado y sus apuestas pendientes se anulan (se devuelve lo apostado). No se puede deshacer.',
      confirmLabel: 'Cancelar partido',
      cancelLabel: 'Volver',
      subject: subjectOf(match),
    })
    if (!confirmed) return
    await run(match, `No se pudo cancelar ${matchTitle(match)}`, async () => {
      upsert(await cancelMatch(match.id))
      showToast(`Se canceló ${matchTitle(match)}.`)
    })
  }

  async function remove(match: Match) {
    const confirmed = await confirm({
      title: `¿Eliminar ${matchTitle(match)}?`,
      message:
        'Solo se elimina un partido programado o cancelado, sin anotaciones ni apuestas. Los equipos y la fase no cambian.',
      confirmLabel: 'Eliminar partido',
      subject: subjectOf(match),
    })
    if (!confirmed) return
    await run(match, `No se pudo eliminar ${matchTitle(match)}`, async () => {
      await deleteMatch(match.id)
      setItems((list) => list.filter((item) => item.id !== match.id))
      setSelectedId(null)
      showToast(`Se eliminó ${matchTitle(match)}.`)
    })
  }

  const noPhases = canListPhases && !phasesList.loading && phasesList.items.length === 0

  return (
    <div className="page page--vivid">
      <PageHeading icon={Swords} title="Partidos" finding={finding}>
        <BackToTournaments tournamentId={tournament.id} />
      </PageHeading>

      <TournamentPicker
        groupBy="status"
        tournaments={tournaments}
        tournament={tournament}
        sports={sports}
        onChoose={onChooseTournament}
      />
      <TournamentTabs tournamentId={tournament.id} current="torneos-partidos" />

      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Buscar por equipo"
        actions={
          canCreate &&
          !noPhases && (
            <ToolbarButton primary icon={Plus} label="Programar partido" onClick={() => setEditing('new')} />
          )
        }
      >
        <select
          aria-label="Filtrar por fase"
          value={phaseId ?? ''}
          onChange={(e) => {
            setPhaseId(e.target.value === '' ? null : Number(e.target.value))
            setGroupId(null)
          }}
        >
          <option value="">Todas las fases</option>
          {phaseOptions.map((phase) => (
            <option key={phase.id} value={phase.id}>
              {phase.order}. {phase.name}
            </option>
          ))}
        </select>
        {groupOptions.length > 0 && (
          <select
            aria-label="Filtrar por grupo"
            value={groupId ?? ''}
            onChange={(e) => setGroupId(e.target.value === '' ? null : Number(e.target.value))}
          >
            <option value="">Todos los grupos</option>
            {groupOptions.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Filtrar por estado"
          value={status}
          onChange={(e) => setStatus(e.target.value as MatchStatus | '')}
        >
          <option value="">Todos los estados</option>
          <option value="EN_JUEGO">En juego</option>
          <option value="PROGRAMADO">Programados</option>
          <option value="FINALIZADO">Finalizados</option>
          <option value="CANCELADO">Cancelados</option>
        </select>
      </ListToolbar>

      <div className="page__grid">
        <ListPanel
          title="Partidos del torneo"
          titleId="matches-list-title"
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
                ? 'Ningún partido coincide con los filtros.'
                : noPhases
                  ? `${tournament.name} todavía no tiene fases: créalas en Fases y grupos para programar partidos.`
                  : canCreate
                    ? 'Todavía no hay partidos. Programa el primero con "Programar partido".'
                    : `${tournament.name} todavía no tiene partidos.`
          }
        >
          <MatchesTable
            matches={visible}
            selectedId={selected?.id ?? null}
            sort={sort}
            onSort={toggleSort}
            onSelect={select}
            busyId={busyId}
            onEdit={abilities.edit ? setEditing : undefined}
            onDelete={abilities.remove ? remove : undefined}
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
                  ? 'Cuando programes un partido, aquí verás su marcador, su estado y sus anotaciones.'
                  : 'Ningún partido coincide con los filtros.'
          }
          busy={selected !== null && busyId === selected.id}
          error={actionError}
          onDismissError={() => setActionError(null)}
          abilities={abilities}
          scoreAbilities={scoreAbilities}
          onStart={start}
          onCancel={cancel}
          onEdit={setEditing}
          onDelete={remove}
          onResult={(match) => {
            // El elegido queda fijo: si era "el que está en juego", al finalizar no debe saltar a otro.
            setSelectedId(match.id)
            setResulting(match)
          }}
          onScoresChanged={reload}
          onToast={showToast}
        />
      </div>

      {editing && (
        <MatchFormDialog
          tournament={tournament}
          phases={phasesList.items}
          matches={matches}
          match={editing === 'new' ? null : editing}
          defaultPhaseId={phaseId}
          onClose={() => setEditing(null)}
          onSaved={(saved, isNew) => {
            setEditing(null)
            upsert(saved)
            setSelectedId(saved.id)
            setActionError(null)
            showToast(isNew ? `Se programó ${matchTitle(saved)}.` : 'Cambios guardados.')
          }}
        />
      )}
      {resulting && (
        <ResultDialog
          match={resulting}
          onClose={() => setResulting(null)}
          onSaved={(saved) => {
            setResulting(null)
            upsert(saved)
            setSelectedId(saved.id)
            setActionError(null)
            const result = saved.result
            showToast(
              result
                ? `Resultado guardado: ${saved.homeTeam.name} ${result.homeScore} – ${result.awayScore} ${saved.awayTeam.name}.`
                : 'Resultado guardado.',
            )
          }}
        />
      )}
      {confirmDialog}
      {toast}
    </div>
  )
}
