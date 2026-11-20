import { CircleAlert, ClipboardList, Info, Search, UserMinus, UserPlus, Users } from 'lucide-react'
import { useCallback, useMemo, useState, type CSSProperties } from 'react'
import { errorMessage } from '../../api/client'
import { findSports, type Sport } from '../../api/sports'
import { findTeams, type Team, type TeamSummary } from '../../api/teams'
import { findRegistrationsByTournament, registerTeams, withdrawTeam } from '../../api/tournamentTeams'
import { findTournaments, type Tournament } from '../../api/tournaments'
import { RESOURCES, useAccess } from '../../auth/access'
import { ActionAlert, type ActionError } from '../../components/ActionAlert'
import { AnimatedNumber } from '../../components/AnimatedNumber'
import { SubjectBreak, SubjectVisual } from '../../components/ConfirmDialog'
import { PanelHead, PageHeading } from '../../components/PageHeading'
import { TeamMonogram } from '../../components/TeamMonogram'
import { TournamentBadge } from '../../components/TournamentBadge'
import { TournamentPicker } from '../../components/TournamentPicker'
import { useConfirm } from '../../hooks/useConfirm'
import { useLoadList } from '../../hooks/useLoadList'
import { useToast } from '../../hooks/useToast'
import { formatDateShort } from '../../utils/dates'
import { plural } from '../../utils/plural'
import { normalize } from '../roles/labels'
import { categoryLabel, registrationSentence } from './tournamentInfo'
import { BackToTournaments, TournamentScreenFallback } from './TournamentScreen'
import { TournamentTabs } from './TournamentTabs'
import '../../components/ListPage.css'
import '../../components/CardGrid.css'
import '../../components/DetailPanel.css'
import '../../components/Vivid.css'
import '../../components/Association.css'
import './Tournaments.css'

// La URL dice qué torneo está abierto (#torneos-inscripciones/{id}): al recargar se abre el mismo.
// replaceState no agrega pasos al botón "Atrás" del navegador.
function showTournamentInUrl(tournamentId: number) {
  window.history.replaceState(null, '', `#torneos-inscripciones/${tournamentId}`)
}

interface TournamentTeamsPageProps {
  initialTournamentId: number | null // torneo pedido en la URL, por ejemplo desde su tarjeta en Torneos
}

// Pantalla "Inscripciones" (HU-GC-02): se elige un torneo y se le inscriben uno o varios equipos a la
// vez, o se retira la inscripción de uno. A la izquierda, los equipos que pueden inscribirse; a la
// derecha, los inscritos.
export function TournamentTeamsPage({ initialTournamentId }: TournamentTeamsPageProps) {
  const { can } = useAccess()
  const canListTeams = can(RESOURCES.teams, 'LIST')
  const tournamentsList = useLoadList(findTournaments)
  // Los equipos dicen quiénes pueden inscribirse (activos y con el deporte del torneo). Sin ese permiso,
  // la pantalla muestra los inscritos, pero no deja inscribir.
  const teamsList = useLoadList(findTeams, canListTeams)
  // Solo para el balón del deporte.
  const sportsList = useLoadList(findSports, can(RESOURCES.sports, 'LIST'))
  const tournaments = tournamentsList.items
  const [tournamentId, setTournamentId] = useState<number | null>(initialTournamentId)

  // El de la URL; si no hay o ya no existe, el primero con inscripciones abiertas (o el primero).
  const tournament =
    tournaments.find((item) => item.id === tournamentId) ??
    tournaments.find((item) => item.registrationOpen) ??
    tournaments[0] ??
    null

  if (tournamentsList.loadError || tournamentsList.loading || !tournament) {
    return (
      <TournamentScreenFallback
        icon={ClipboardList}
        title="Inscripciones"
        loading={tournamentsList.loading}
        loadError={tournamentsList.loadError}
        onRetry={tournamentsList.retry}
      />
    )
  }

  return (
    // La key vuelve a montar las inscripciones al cambiar de torneo: las carga desde cero.
    <Registrations
      key={tournament.id}
      tournament={tournament}
      tournaments={tournaments}
      teams={teamsList.items}
      teamsLoading={teamsList.loading}
      teamsError={teamsList.loadError}
      onRetryTeams={teamsList.retry}
      sports={sportsList.items}
      canListTeams={canListTeams}
      onChooseTournament={(id) => {
        setTournamentId(id)
        showTournamentInUrl(id)
      }}
      onChanged={tournamentsList.reload} // cuántos equipos tiene cada torneo
    />
  )
}

interface RegistrationsProps {
  tournament: Tournament
  tournaments: Tournament[]
  teams: Team[]
  teamsLoading: boolean
  teamsError: string | null
  onRetryTeams: () => void
  sports: Sport[]
  canListTeams: boolean
  onChooseTournament: (tournamentId: number) => void
  onChanged: () => void
}

function Registrations({
  tournament,
  tournaments,
  teams,
  teamsLoading,
  teamsError,
  onRetryTeams,
  sports,
  canListTeams,
  onChooseTournament,
  onChanged,
}: RegistrationsProps) {
  const { can } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const { showToast, toast } = useToast()
  const canRegister = can(RESOURCES.registrations, 'CREATE') && canListTeams
  const canWithdraw = can(RESOURCES.registrations, 'DELETE')
  const open = tournament.registrationOpen

  const fetchRegistrations = useCallback(() => findRegistrationsByTournament(tournament.id), [tournament.id])
  const { items: registrations, loading, loadError, reload, retry } = useLoadList(fetchRegistrations)
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<ReadonlySet<number>>(new Set())
  const [registering, setRegistering] = useState(false)
  const [busyTeamId, setBusyTeamId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<ActionError | null>(null)
  const busy = registering || busyTeamId !== null

  const sportId = tournament.sport.id
  // Equipos activos que juegan el deporte del torneo, inscritos o no.
  const playing = useMemo(() => teams.filter((team) => team.active && playsSport(team, sportId)), [teams, sportId])

  // Pueden inscribirse los equipos activos, asociados al deporte del torneo y todavía no inscritos: las
  // mismas reglas del backend.
  const eligible = useMemo(() => {
    const registered = new Set(registrations.map((registration) => registration.team.id))
    return playing.filter((team) => !registered.has(team.id))
  }, [playing, registrations])
  const candidates = useMemo(() => {
    const text = normalize(query.trim())
    return eligible.filter(
      (team) =>
        !text ||
        normalize(team.name).includes(text) ||
        normalize(team.shortName ?? '').includes(text) ||
        normalize(team.city).includes(text),
    )
  }, [eligible, query])
  // Lo elegido que todavía se puede inscribir (tras recargar, alguno pudo quedar inscrito por otra persona).
  const chosen = eligible.filter((team) => picked.has(team.id))
  // Equipos activos que no juegan el deporte del torneo: para inscribirlos, primero hay que asociarlos.
  const withoutSport = teams.filter((team) => team.active).length - playing.length

  const finding = loading
    ? 'Cargando inscripciones…'
    : loadError
      ? 'No se pudieron cargar las inscripciones.'
      : `${tournament.name} tiene ${plural(registrations.length, 'equipo inscrito', 'equipos inscritos')}. ` +
        registrationSentence(tournament)

  function toggle(teamId: number) {
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(teamId)) next.delete(teamId)
      else next.add(teamId)
      return next
    })
  }

  async function register() {
    if (chosen.length === 0) return
    setRegistering(true)
    setActionError(null)
    try {
      await registerTeams(
        tournament.id,
        chosen.map((team) => team.id),
      )
      showToast(
        chosen.length === 1
          ? `${chosen[0].name} quedó inscrito en ${tournament.name}.`
          : `Se inscribieron ${chosen.length} equipos en ${tournament.name}.`,
      )
      setPicked(new Set())
      setQuery('')
      reload()
      onChanged()
    } catch (err) {
      // Todo o nada: si uno no cumple, no se inscribe ninguno y el mensaje dice cuál.
      setActionError({
        title: chosen.length === 1 ? `No se pudo inscribir a ${chosen[0].name}` : 'No se inscribió ningún equipo',
        message: errorMessage(err),
      })
    } finally {
      setRegistering(false)
    }
  }

  async function withdraw(team: TeamSummary) {
    const confirmed = await confirm({
      title: `¿Retirar a ${team.name} de ${tournament.name}?`,
      message: 'Solo se retira la inscripción: el equipo y el torneo siguen registrados.',
      confirmLabel: 'Retirar inscripción',
      subject: (
        <>
          <SubjectVisual visual={<TeamMonogram team={team} size="sm" />} name={team.name} detail="Equipo" />
          <SubjectBreak />
          <SubjectVisual
            visual={<TournamentBadge tournament={tournament} size="sm" />}
            name={tournament.name}
            detail={`${tournament.sport.name} · ${categoryLabel(tournament.category)}`}
          />
        </>
      ),
    })
    if (!confirmed) return
    setBusyTeamId(team.id)
    setActionError(null)
    try {
      await withdrawTeam(tournament.id, team.id)
      showToast(`${team.name} ya no está inscrito en ${tournament.name}.`)
      reload()
      onChanged()
    } catch (err) {
      // ej: 400 si ya está en un grupo, si ya tiene partidos o si las inscripciones cerraron
      setActionError({ title: `No se pudo retirar a ${team.name}`, message: errorMessage(err) })
      reload()
    } finally {
      setBusyTeamId(null)
    }
  }

  return (
    <div className="page page--vivid">
      <PageHeading icon={ClipboardList} title="Inscripciones" finding={finding}>
        <BackToTournaments tournamentId={tournament.id} />
      </PageHeading>

      <TournamentPicker
        tournaments={tournaments}
        tournament={tournament}
        sports={sports}
        onChoose={onChooseTournament}
      />
      <TournamentTabs tournamentId={tournament.id} current="torneos-inscripciones" />

      {actionError && <ActionAlert error={actionError} onDismiss={() => setActionError(null)} />}

      <div className={canRegister ? 'assoc' : undefined}>
        {canRegister && (
          <section className="panel" aria-labelledby="eligible-title" aria-busy={teamsLoading}>
            <PanelHead
              icon={UserPlus}
              title="Equipos disponibles"
              titleId="eligible-title"
              count={open && !teamsLoading && !teamsError ? plural(eligible.length, 'equipo', 'equipos') : null}
            />

            {!open ? (
              <p className="empty-state">
                {registrationSentence(tournament)} Ya no se pueden inscribir equipos en {tournament.name}.
              </p>
            ) : teamsError ? (
              <div className="inline-error" role="alert">
                <CircleAlert size={16} aria-hidden="true" />
                <span>{teamsError}</span>
                <button type="button" className="text-action" onClick={onRetryTeams}>
                  Reintentar
                </button>
              </div>
            ) : teamsLoading ? (
              <p className="empty-state">Cargando equipos…</p>
            ) : (
              <>
                <label className="list-search assoc__search">
                  <Search size={16} aria-hidden="true" />
                  <input
                    type="search"
                    placeholder="Buscar por nombre o ciudad"
                    aria-label="Buscar equipos disponibles"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>

                <div className="enroll-bar">
                  <p className="enroll-bar__count" aria-live="polite">
                    {chosen.length === 0
                      ? 'Elige uno o varios equipos.'
                      : `${plural(chosen.length, 'equipo elegido', 'equipos elegidos')}.`}
                  </p>
                  {chosen.length > 0 ? (
                    <button
                      type="button"
                      className="button button--text"
                      disabled={busy}
                      onClick={() => setPicked(new Set())}
                    >
                      Quitar selección
                    </button>
                  ) : (
                    candidates.length > 1 && (
                      <button
                        type="button"
                        className="button button--text"
                        disabled={busy}
                        onClick={() => setPicked(new Set(candidates.map((team) => team.id)))}
                      >
                        Elegir todos
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    className="button button--primary"
                    disabled={busy || chosen.length === 0}
                    onClick={register}
                  >
                    <UserPlus size={16} aria-hidden="true" />
                    {registering
                      ? 'Inscribiendo…'
                      : chosen.length > 1
                        ? `Inscribir ${chosen.length} equipos`
                        : 'Inscribir'}
                  </button>
                </div>

                {candidates.length === 0 ? (
                  <p className="empty-state">
                    {eligible.length > 0
                      ? 'Ningún equipo disponible coincide con la búsqueda.'
                      : playing.length > 0
                        ? `Todos los equipos activos de ${tournament.sport.name} ya están inscritos.`
                        : `Ningún equipo activo juega ${tournament.sport.name}.`}
                  </p>
                ) : (
                  <ul className="card-grid" aria-label="Equipos que se pueden inscribir">
                    {candidates.map((team, index) => {
                      const checked = picked.has(team.id)
                      return (
                        <li key={team.id} className="card-grid__item" style={{ '--i': index } as CSSProperties}>
                          <label
                            className={`entity-card entity-card--center entity-card--pick${checked ? ' is-selected' : ''}`}
                          >
                            <input
                              type="checkbox"
                              className="entity-card__check"
                              checked={checked}
                              disabled={busy}
                              onChange={() => toggle(team.id)}
                            />
                            <span className="entity-card__visual">
                              <TeamMonogram team={team} size="lg" />
                            </span>
                            <span className="entity-card__name">{team.name}</span>
                            <span className="entity-card__meta">{team.city}</span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                )}

                <p className="assoc__note">
                  <Info size={16} aria-hidden="true" />
                  {withoutSport > 0
                    ? `Solo aparecen los equipos activos asociados a ${tournament.sport.name}. ` +
                      `${plural(withoutSport, 'equipo activo no juega', 'equipos activos no juegan')} este deporte: ` +
                      'asócialos en Equipos para poder inscribirlos.'
                    : `Solo aparecen los equipos activos asociados a ${tournament.sport.name}.`}
                </p>
              </>
            )}
          </section>
        )}

        <section className="panel" aria-labelledby="registered-title" aria-busy={loading}>
          <PanelHead
            icon={Users}
            title="Equipos inscritos"
            titleId="registered-title"
            count={loading || loadError ? null : plural(registrations.length, 'equipo', 'equipos')}
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
            <p className="empty-state">Cargando equipos inscritos…</p>
          ) : (
            <>
              <div className="score">
                <p className="score__figure">
                  <AnimatedNumber value={registrations.length} className="score__value" />
                  <span className="score__of">
                    {registrations.length === 1 ? 'equipo inscrito' : 'equipos inscritos'}
                  </span>
                </p>
              </div>

              {registrations.length === 0 ? (
                <p className="empty-state">
                  {open && canRegister
                    ? 'Inscribe el primero desde la lista de disponibles.'
                    : `${tournament.name} no tiene equipos inscritos.`}
                </p>
              ) : (
                <ul className="detail-list assoc__list">
                  {registrations.map(({ team, registeredAt }) => (
                    <li key={team.id} className="detail-list__item">
                      <TeamMonogram team={team} size="md" />
                      <span className="detail-list__name">
                        {team.name}
                        <span className="detail-list__detail">
                          Inscrito el {formatDateShort(registeredAt)}
                          {team.active ? '' : ' · Equipo desactivado'}
                        </span>
                      </span>
                      {canWithdraw && open && (
                        <button
                          type="button"
                          className="button button--text row-actions__danger"
                          disabled={busy}
                          aria-label={`Retirar a ${team.name} de ${tournament.name}`}
                          onClick={() => withdraw(team)}
                        >
                          <UserMinus size={16} aria-hidden="true" />
                          <span className="assoc__label">
                            {busyTeamId === team.id ? 'Retirando…' : 'Retirar inscripción'}
                          </span>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <p className="assoc__note">
            <Info size={16} aria-hidden="true" />
            {open
              ? 'Retirar una inscripción no borra el equipo ni el torneo. Un equipo que ya está en un grupo o ' +
                'tiene partidos en el torneo no se puede retirar.'
              : 'Las inscripciones están cerradas: los equipos inscritos ya no se pueden retirar.'}
          </p>
        </section>
      </div>
      {confirmDialog}
      {toast}
    </div>
  )
}

// Si el equipo está asociado al deporte (HU-GD-03): es requisito para inscribirlo.
function playsSport(team: Team, sportId: number): boolean {
  return team.sports.some((sport) => sport.id === sportId)
}
