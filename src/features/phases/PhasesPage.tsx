import { CircleAlert, Info, Layers, Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { errorMessage } from '../../api/client'
import { deletePhase, findPhasesByTournament, reorderPhases, type Phase } from '../../api/phases'
import { findSports, type Sport } from '../../api/sports'
import { findRegistrationsByTournament } from '../../api/tournamentTeams'
import { findTournaments, type Tournament } from '../../api/tournaments'
import { RESOURCES, useAccess } from '../../auth/access'
import { ActionAlert, type ActionError } from '../../components/ActionAlert'
import { SubjectItem } from '../../components/ConfirmDialog'
import { PageHeading, PanelHead } from '../../components/PageHeading'
import { TournamentPicker } from '../../components/TournamentPicker'
import { useConfirm } from '../../hooks/useConfirm'
import { useLoadList } from '../../hooks/useLoadList'
import { useToast } from '../../hooks/useToast'
import { plural } from '../../utils/plural'
import { BackToTournaments, TournamentScreenFallback } from '../tournaments/TournamentScreen'
import { TournamentTabs } from '../tournaments/TournamentTabs'
import { FinalPhasePanel } from './FinalPhasePanel'
import { GroupPhasePanel, type GroupAbilities } from './GroupPhasePanel'
import { PhaseFormDialog, type PhaseSuggestion } from './PhaseFormDialog'
import { PhaseHead } from './PhaseHead'
import { PhaseList } from './PhaseList'
import { advancingTeams, bracketsOf, FINAL_ROUNDS, PHASE_TYPES, phasesSentence } from './phaseInfo'
import '../../components/ListPage.css'
import '../../components/CardGrid.css'
import '../../components/DetailPanel.css'
import '../../components/Vivid.css'
import '../../components/Association.css'
import './Phases.css'

// La URL dice qué torneo está abierto (#torneos-fases/{id}): al recargar se abre el mismo.
function showTournamentInUrl(tournamentId: number) {
  window.history.replaceState(null, '', `#torneos-fases/${tournamentId}`)
}

interface PhasesPageProps {
  initialTournamentId: number | null // torneo pedido en la URL, por ejemplo desde su tarjeta en Torneos
}

// Pantalla "Fases y grupos" (HU-GC-03, 04 y 05): se elige un torneo; a la izquierda, sus fases en el
// orden en que se juegan; a la derecha, la fase elegida (sus grupos con sus equipos, o sus llaves).
export function PhasesPage({ initialTournamentId }: PhasesPageProps) {
  const { can } = useAccess()
  const tournamentsList = useLoadList(findTournaments)
  const sportsList = useLoadList(findSports, can(RESOURCES.sports, 'LIST')) // solo para el balón del deporte
  const tournaments = tournamentsList.items
  const [tournamentId, setTournamentId] = useState<number | null>(initialTournamentId)

  // El de la URL; si no hay o ya no existe, el primero activo que no ha terminado (o el primero).
  const tournament =
    tournaments.find((item) => item.id === tournamentId) ??
    tournaments.find((item) => item.active && item.status !== 'FINALIZADO') ??
    tournaments[0] ??
    null

  if (tournamentsList.loadError || tournamentsList.loading || !tournament) {
    return (
      <TournamentScreenFallback
        icon={Layers}
        title="Fases y grupos"
        loading={tournamentsList.loading}
        loadError={tournamentsList.loadError}
        onRetry={tournamentsList.retry}
      />
    )
  }

  return (
    // La key vuelve a montar las fases al cambiar de torneo: las carga desde cero.
    <TournamentPhases
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

// Lo que se propone al crear una fase: sin fases, una de grupos; después, una final con los equipos que
// deja pasar la última (si es un número válido para una fase final).
function suggestNext(phases: Phase[]): PhaseSuggestion {
  const last = phases.at(-1)
  if (!last) return { type: 'GRUPOS', teamsCount: null }
  const incoming = last.type === 'GRUPOS' ? advancingTeams(last) : bracketsOf(last)
  return { type: 'FINAL', teamsCount: FINAL_ROUNDS.some((round) => round.teams === incoming) ? incoming : null }
}

interface TournamentPhasesProps {
  tournament: Tournament
  tournaments: Tournament[]
  sports: Sport[]
  onChooseTournament: (tournamentId: number) => void
}

// Carga las fases y los inscritos del torneo, decide qué puede hacer la sesión y maneja las acciones
// sobre las fases (crear, editar, mover y eliminar). Los grupos los maneja GroupPhasePanel.
function TournamentPhases({ tournament, tournaments, sports, onChooseTournament }: TournamentPhasesProps) {
  const { can } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const { showToast, toast } = useToast()
  const active = tournament.active
  const canCreate = can(RESOURCES.phases, 'CREATE') && active
  const canUpdate = can(RESOURCES.phases, 'UPDATE')
  const canDelete = can(RESOURCES.phases, 'DELETE')
  const canListRegistrations = can(RESOURCES.registrations, 'LIST')
  // Un torneo desactivado no recibe fases, grupos ni equipos nuevos (el backend responde 400).
  const groupAbilities: GroupAbilities = {
    list: can(RESOURCES.groups, 'LIST'),
    create: can(RESOURCES.groups, 'CREATE') && active,
    rename: can(RESOURCES.groups, 'UPDATE'),
    remove: can(RESOURCES.groups, 'DELETE'),
    assign: can(RESOURCES.groupTeams, 'CREATE') && canListRegistrations && active,
    removeTeam: can(RESOURCES.groupTeams, 'DELETE'),
  }

  const fetchPhases = useCallback(() => findPhasesByTournament(tournament.id), [tournament.id])
  const { items: phases, setItems, loading, loadError, reload, retry } = useLoadList(fetchPhases)
  // Los inscritos dicen quiénes pueden entrar a los grupos.
  const fetchRegistrations = useCallback(() => findRegistrationsByTournament(tournament.id), [tournament.id])
  const registrationsList = useLoadList(fetchRegistrations, canListRegistrations)
  const registrations =
    canListRegistrations && !registrationsList.loading && !registrationsList.loadError ? registrationsList.items : null

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState<{ phase: Phase | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<ActionError | null>(null)

  // La elegida; si no hay o ya no existe, la primera.
  const selectedIndex = Math.max(
    0,
    phases.findIndex((phase) => phase.id === selectedId),
  )
  const selected = phases[selectedIndex] ?? null

  const finding = loading
    ? 'Cargando fases…'
    : loadError
      ? 'No se pudieron cargar las fases.'
      : phasesSentence(tournament.name, phases) + (phases.length > 1 ? ` Se empieza por "${phases[0].name}".` : '')

  async function move(phase: Phase, step: -1 | 1) {
    const ids = phases.map((item) => item.id)
    const from = ids.indexOf(phase.id)
    const to = from + step
    if (from < 0 || to < 0 || to >= ids.length) return
    ;[ids[from], ids[to]] = [ids[to], ids[from]]
    setBusy(true)
    setActionError(null)
    try {
      setItems(await reorderPhases(tournament.id, ids))
      showToast(`${phase.name} quedó en el lugar ${to + 1}.`)
    } catch (err) {
      setActionError({ title: `No se pudo mover ${phase.name}`, message: errorMessage(err) })
      reload()
    } finally {
      setBusy(false)
    }
  }

  async function remove(phase: Phase) {
    const info = PHASE_TYPES[phase.type]
    const confirmed = await confirm({
      title: `¿Eliminar ${phase.name}?`,
      message:
        'El torneo y sus demás fases no se eliminan: las que iban después suben un lugar. Una fase con grupos ' +
        'o con partidos no se puede eliminar.',
      confirmLabel: 'Eliminar fase',
      subject: <SubjectItem icon={info.icon} name={phase.name} detail={`${info.label} · ${tournament.name}`} />,
    })
    if (!confirmed) return
    setBusy(true)
    setActionError(null)
    try {
      await deletePhase(phase.id)
      showToast(`Se eliminó ${phase.name}.`)
      reload() // las que iban después cambiaron de lugar
    } catch (err) {
      // ej: 400 "No se puede eliminar porque tiene grupos (Grupo A, Grupo B)"
      setActionError({ title: `No se pudo eliminar ${phase.name}`, message: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  const headFor = (phase: Phase) => (
    <PhaseHead
      phase={phase}
      phasesCount={phases.length}
      titleId="phase-panel-title"
      canUpdate={canUpdate}
      canDelete={canDelete}
      busy={busy}
      onEdit={() => setForm({ phase })}
      onDelete={() => remove(phase)}
    />
  )

  return (
    <div className="page page--vivid">
      <PageHeading icon={Layers} title="Fases y grupos" finding={finding}>
        <BackToTournaments tournamentId={tournament.id} />
      </PageHeading>

      <TournamentPicker
        groupBy="status"
        tournaments={tournaments}
        tournament={tournament}
        sports={sports}
        onChoose={onChooseTournament}
      >
        {canCreate && (
          <button
            type="button"
            className="button button--primary"
            disabled={busy || loading || loadError !== null}
            onClick={() => setForm({ phase: null })}
          >
            <Plus size={16} aria-hidden="true" />
            Nueva fase
          </button>
        )}
      </TournamentPicker>
      <TournamentTabs tournamentId={tournament.id} current="torneos-fases" />

      {actionError && <ActionAlert error={actionError} onDismiss={() => setActionError(null)} />}

      <div className={selected ? 'phases-layout' : undefined}>
        <section className="panel" aria-labelledby="phases-title" aria-busy={loading}>
          <PanelHead
            icon={Layers}
            title="Fases"
            titleId="phases-title"
            count={loading || loadError ? null : plural(phases.length, 'fase', 'fases')}
          />
          {loadError ? (
            <div className="inline-error" role="alert">
              <CircleAlert size={16} aria-hidden="true" />
              <span>{loadError}</span>
              <button type="button" className="text-action" onClick={retry}>
                Reintentar
              </button>
            </div>
          ) : loading ? (
            <p className="empty-state">Cargando fases…</p>
          ) : phases.length === 0 ? (
            <p className="empty-state">
              {canCreate
                ? 'Crea la primera con "Nueva fase": por ejemplo, una fase de grupos y después las fases finales.'
                : `${tournament.name} todavía no tiene fases.`}
            </p>
          ) : (
            <PhaseList
              phases={phases}
              selectedId={selected?.id ?? null}
              onSelect={setSelectedId}
              canReorder={canUpdate}
              busy={busy}
              onMove={move}
            />
          )}
          <p className="assoc__note">
            <Info size={16} aria-hidden="true" />
            {active
              ? 'El número de cada fase es el orden en que se juega.'
              : 'El torneo está desactivado: actívalo en Torneos para agregarle fases, grupos o equipos.'}
          </p>
        </section>

        {selected &&
          (selected.type === 'GRUPOS' ? (
            // La key vuelve a montar el panel al cambiar de fase: carga sus grupos desde cero.
            <GroupPhasePanel
              key={selected.id}
              phase={selected}
              head={headFor(selected)}
              titleId="phase-panel-title"
              registrations={registrations}
              abilities={groupAbilities}
              onGroupsChanged={reload}
              onToast={showToast}
            />
          ) : (
            <FinalPhasePanel
              key={selected.id}
              phase={selected}
              previous={phases[selectedIndex - 1] ?? null}
              head={headFor(selected)}
              titleId="phase-panel-title"
            />
          ))}
      </div>

      {form && (
        <PhaseFormDialog
          tournamentId={tournament.id}
          phase={form.phase}
          suggestion={suggestNext(phases)}
          onClose={() => setForm(null)}
          onSaved={(saved, isNew) => {
            setForm(null)
            setActionError(null) // el aviso de una acción anterior ya no aplica
            setItems((current) =>
              [...current.filter((item) => item.id !== saved.id), saved].sort((a, b) => a.order - b.order),
            )
            if (isNew) setSelectedId(saved.id)
            showToast(isNew ? `Se creó la fase ${saved.name}.` : 'Cambios guardados.')
          }}
        />
      )}
      {confirmDialog}
      {toast}
    </div>
  )
}
