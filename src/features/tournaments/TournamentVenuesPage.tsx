import { Building2, CircleAlert, Info, MapPinMinus, MapPinPlus, Search } from 'lucide-react'
import { useCallback, useMemo, useState, type CSSProperties } from 'react'
import { errorMessage } from '../../api/client'
import { findSports, type Sport } from '../../api/sports'
import { assignVenues, findVenuesByTournament, withdrawVenue } from '../../api/tournamentVenues'
import { findTournaments, type Tournament } from '../../api/tournaments'
import { findVenues, type Venue, type VenueLocation } from '../../api/venues'
import { canOpenPage, RESOURCES, useAccess } from '../../auth/access'
import { ActionAlert, type ActionError } from '../../components/ActionAlert'
import { AnimatedNumber } from '../../components/AnimatedNumber'
import { SubjectBreak, SubjectVisual } from '../../components/ConfirmDialog'
import { PanelHead, PageHeading } from '../../components/PageHeading'
import { TournamentBadge } from '../../components/TournamentBadge'
import { TournamentPicker } from '../../components/TournamentPicker'
import { VenuePhoto } from '../../components/VenuePhoto'
import { useConfirm } from '../../hooks/useConfirm'
import { useLoadList } from '../../hooks/useLoadList'
import { useToast } from '../../hooks/useToast'
import { plural } from '../../utils/plural'
import { normalize } from '../roles/labels'
import { locationOf, seats, treeOrder } from '../venues/venueInfo'
import { categoryLabel } from './tournamentInfo'
import { BackToTournaments, TournamentScreenFallback } from './TournamentScreen'
import { TournamentTabs } from './TournamentTabs'
import '../../components/ListPage.css'
import '../../components/CardGrid.css'
import '../../components/DetailPanel.css'
import '../../components/Vivid.css'
import '../../components/Association.css'
import './Tournaments.css'

// La URL dice qué torneo está abierto (#torneos-escenarios/{id}): al recargar se abre el mismo.
// replaceState no agrega pasos al botón "Atrás" del navegador.
function showTournamentInUrl(tournamentId: number) {
  window.history.replaceState(null, '', `#torneos-escenarios/${tournamentId}`)
}

interface TournamentVenuesPageProps {
  initialTournamentId: number | null // torneo pedido en la URL, por ejemplo desde su tarjeta en Torneos
}

// Pantalla "Escenarios del torneo" (HU-GE-02): se elige un torneo y se le asignan uno o varios
// escenarios a la vez, o se retira uno. Sus partidos solo se programan en estos. A la izquierda, los
// escenarios que se pueden asignar; a la derecha, los asignados.
export function TournamentVenuesPage({ initialTournamentId }: TournamentVenuesPageProps) {
  const { can } = useAccess()
  const canListVenues = can(RESOURCES.venues, 'LIST')
  const tournamentsList = useLoadList(findTournaments)
  // Los escenarios dicen cuáles se pueden asignar (disponibles) y la capacidad de cada uno. Sin ese
  // permiso, la pantalla muestra los asignados, pero no deja asignar.
  const venuesList = useLoadList(findVenues, canListVenues)
  const sportsList = useLoadList(findSports, can(RESOURCES.sports, 'LIST')) // solo para el balón del deporte
  const tournaments = tournamentsList.items
  const [tournamentId, setTournamentId] = useState<number | null>(initialTournamentId)

  // El de la URL; si no hay o ya no existe, el primero activo (o el primero).
  const tournament =
    tournaments.find((item) => item.id === tournamentId) ??
    tournaments.find((item) => item.active) ??
    tournaments[0] ??
    null

  if (tournamentsList.loadError || tournamentsList.loading || !tournament) {
    return (
      <TournamentScreenFallback
        icon={Building2}
        title="Escenarios del torneo"
        loading={tournamentsList.loading}
        loadError={tournamentsList.loadError}
        onRetry={tournamentsList.retry}
      />
    )
  }

  return (
    // La key vuelve a montar los asignados al cambiar de torneo: los carga desde cero.
    <Assignments
      key={tournament.id}
      tournament={tournament}
      tournaments={tournaments}
      venues={venuesList.items}
      venuesLoading={venuesList.loading}
      venuesError={venuesList.loadError}
      onRetryVenues={venuesList.retry}
      sports={sportsList.items}
      canListVenues={canListVenues}
      onChooseTournament={(id) => {
        setTournamentId(id)
        showTournamentInUrl(id)
      }}
    />
  )
}

interface AssignmentsProps {
  tournament: Tournament
  tournaments: Tournament[]
  venues: Venue[]
  venuesLoading: boolean
  venuesError: string | null
  onRetryVenues: () => void
  sports: Sport[]
  canListVenues: boolean
  onChooseTournament: (tournamentId: number) => void
}

function Assignments({
  tournament,
  tournaments,
  venues,
  venuesLoading,
  venuesError,
  onRetryVenues,
  sports,
  canListVenues,
  onChooseTournament,
}: AssignmentsProps) {
  const { can } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const { showToast, toast } = useToast()
  const canAssign = can(RESOURCES.tournamentVenues, 'CREATE') && canListVenues
  const canWithdraw = can(RESOURCES.tournamentVenues, 'DELETE')
  const canOpenVenues = canOpenPage('escenarios', can)

  const fetchAssigned = useCallback(() => findVenuesByTournament(tournament.id), [tournament.id])
  const { items: assigned, loading, loadError, reload, retry } = useLoadList(fetchAssigned)
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<ReadonlySet<number>>(new Set())
  const [assigning, setAssigning] = useState(false)
  const [busyVenueId, setBusyVenueId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<ActionError | null>(null)
  const busy = assigning || busyVenueId !== null

  // La capacidad de cada asignado sale de la lista de escenarios (la asignación no la trae).
  const venueById = useMemo(() => new Map(venues.map((venue) => [venue.id, venue])), [venues])

  // Se pueden asignar los escenarios disponibles (activos y, si están dentro de otro, ese también) que
  // el torneo todavía no tiene: las mismas reglas del backend. Cada principal, seguido de los de adentro.
  const eligible = useMemo(() => {
    const taken = new Set(assigned.map((row) => row.venue.id))
    return treeOrder(venues.filter((venue) => venue.available && !taken.has(venue.id)))
  }, [venues, assigned])
  const candidates = useMemo(() => {
    const text = normalize(query.trim())
    return eligible.filter(
      (venue) =>
        !text ||
        normalize(venue.name).includes(text) ||
        normalize(venue.parent?.name ?? '').includes(text) ||
        normalize(venue.city).includes(text),
    )
  }, [eligible, query])
  // Lo elegido que todavía se puede asignar (tras recargar, alguno pudo quedar asignado por otra persona).
  const chosen = eligible.filter((venue) => picked.has(venue.id))
  const unavailable = venues.length - venues.filter((venue) => venue.available).length

  const finding = loading
    ? 'Cargando escenarios…'
    : loadError
      ? 'No se pudieron cargar los escenarios del torneo.'
      : assigned.length === 0
        ? `${tournament.name} todavía no tiene escenarios: asígnale al menos uno para programar sus partidos en él.`
        : `${tournament.name} se juega en ${plural(assigned.length, 'escenario', 'escenarios')}. ` +
          'Sus partidos solo se programan en estos.'

  function toggle(venueId: number) {
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(venueId)) next.delete(venueId)
      else next.add(venueId)
      return next
    })
  }

  async function assign() {
    if (chosen.length === 0) return
    setAssigning(true)
    setActionError(null)
    try {
      await assignVenues(
        tournament.id,
        chosen.map((venue) => venue.id),
      )
      showToast(
        chosen.length === 1
          ? `${chosen[0].name} quedó asignado a ${tournament.name}.`
          : `Se asignaron ${chosen.length} escenarios a ${tournament.name}.`,
      )
      setPicked(new Set())
      setQuery('')
      reload()
    } catch (err) {
      // Todo o nada: si uno no cumple, no se asigna ninguno y el mensaje dice cuál.
      setActionError({
        title: chosen.length === 1 ? `No se pudo asignar ${chosen[0].name}` : 'No se asignó ningún escenario',
        message: errorMessage(err),
      })
      reload()
    } finally {
      setAssigning(false)
    }
  }

  async function withdraw(venue: VenueLocation) {
    const confirmed = await confirm({
      title: `¿Retirar ${venue.name} de ${tournament.name}?`,
      message:
        'Solo se retira la asignación: el escenario y el torneo siguen registrados, y los partidos ya jugados ahí ' +
        'conservan su escenario.',
      confirmLabel: 'Retirar del torneo',
      subject: (
        <>
          <SubjectVisual
            visual={<VenuePhoto venue={venueById.get(venue.id) ?? venue} size="sm" />}
            name={venue.name}
            detail={locationOf(venue)}
          />
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
    setBusyVenueId(venue.id)
    setActionError(null)
    try {
      await withdrawVenue(tournament.id, venue.id)
      showToast(`${venue.name} ya no está asignado a ${tournament.name}.`)
      reload()
    } catch (err) {
      // ej: 400 si el torneo tiene partidos programados o en juego en ese escenario
      setActionError({ title: `No se pudo retirar ${venue.name}`, message: errorMessage(err) })
      reload()
    } finally {
      setBusyVenueId(null)
    }
  }

  return (
    <div className="page page--vivid">
      <PageHeading icon={Building2} title="Escenarios del torneo" finding={finding}>
        <BackToTournaments tournamentId={tournament.id} />
      </PageHeading>

      <TournamentPicker tournaments={tournaments} tournament={tournament} sports={sports} onChoose={onChooseTournament} />
      <TournamentTabs tournamentId={tournament.id} current="torneos-escenarios" />

      {actionError && <ActionAlert error={actionError} onDismiss={() => setActionError(null)} />}

      <div className={canAssign ? 'assoc' : undefined}>
        {canAssign && (
          <section className="panel" aria-labelledby="eligible-venues-title" aria-busy={venuesLoading}>
            <PanelHead
              icon={MapPinPlus}
              title="Escenarios disponibles"
              titleId="eligible-venues-title"
              count={
                tournament.active && !venuesLoading && !venuesError
                  ? plural(eligible.length, 'escenario', 'escenarios')
                  : null
              }
            />

            {!tournament.active ? (
              <p className="empty-state">
                {tournament.name} está desactivado: actívalo en Torneos para asignarle escenarios.
              </p>
            ) : venuesError ? (
              <div className="inline-error" role="alert">
                <CircleAlert size={16} aria-hidden="true" />
                <span>{venuesError}</span>
                <button type="button" className="text-action" onClick={onRetryVenues}>
                  Reintentar
                </button>
              </div>
            ) : venuesLoading ? (
              <p className="empty-state">Cargando escenarios…</p>
            ) : (
              <>
                <label className="list-search assoc__search">
                  <Search size={16} aria-hidden="true" />
                  <input
                    type="search"
                    placeholder="Buscar por nombre o ciudad"
                    aria-label="Buscar escenarios disponibles"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>

                <div className="enroll-bar">
                  <p className="enroll-bar__count" aria-live="polite">
                    {chosen.length === 0
                      ? 'Elige uno o varios escenarios.'
                      : `${plural(chosen.length, 'escenario elegido', 'escenarios elegidos')}.`}
                  </p>
                  {chosen.length > 0 ? (
                    <button type="button" className="button button--text" disabled={busy} onClick={() => setPicked(new Set())}>
                      Quitar selección
                    </button>
                  ) : (
                    candidates.length > 1 && (
                      <button
                        type="button"
                        className="button button--text"
                        disabled={busy}
                        onClick={() => setPicked(new Set(candidates.map((venue) => venue.id)))}
                      >
                        Elegir todos
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    className="button button--primary"
                    disabled={busy || chosen.length === 0}
                    onClick={assign}
                  >
                    <MapPinPlus size={16} aria-hidden="true" />
                    {assigning ? 'Asignando…' : chosen.length > 1 ? `Asignar ${chosen.length} escenarios` : 'Asignar'}
                  </button>
                </div>

                {candidates.length === 0 ? (
                  <p className="empty-state">
                    {eligible.length > 0
                      ? 'Ningún escenario disponible coincide con la búsqueda.'
                      : venues.length > 0
                        ? `Todos los escenarios disponibles ya están asignados a ${tournament.name}.`
                        : 'Todavía no hay escenarios registrados: regístralos en Escenarios.'}
                  </p>
                ) : (
                  <ul className="card-grid" aria-label="Escenarios que se pueden asignar">
                    {candidates.map((venue, index) => {
                      const checked = picked.has(venue.id)
                      return (
                        <li key={venue.id} className="card-grid__item" style={{ '--i': index } as CSSProperties}>
                          <label
                            className={`entity-card entity-card--center entity-card--pick${checked ? ' is-selected' : ''}`}
                          >
                            <input
                              type="checkbox"
                              className="entity-card__check"
                              checked={checked}
                              disabled={busy}
                              onChange={() => toggle(venue.id)}
                            />
                            <span className="entity-card__visual">
                              <VenuePhoto venue={venue} size="lg" />
                            </span>
                            <span className="entity-card__name">{venue.name}</span>
                            <span className="entity-card__meta">
                              {venue.parent ? `Dentro de ${venue.parent.name}` : venue.city}
                            </span>
                            <span className="entity-card__meta venue-card__seats num">{seats(venue.capacity)}</span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                )}

                <p className="assoc__note">
                  <Info size={16} aria-hidden="true" />
                  {unavailable > 0
                    ? `Solo aparecen los escenarios activos. ${plural(unavailable, 'escenario está', 'escenarios están')} ` +
                      'desactivado o dentro de uno desactivado: actívalo en Escenarios para poder asignarlo.'
                    : 'Solo aparecen los escenarios activos.'}
                </p>
              </>
            )}
          </section>
        )}

        <section className="panel" aria-labelledby="assigned-venues-title" aria-busy={loading}>
          <PanelHead
            icon={Building2}
            title="Escenarios asignados"
            titleId="assigned-venues-title"
            count={loading || loadError ? null : plural(assigned.length, 'escenario', 'escenarios')}
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
            <p className="empty-state">Cargando escenarios asignados…</p>
          ) : (
            <>
              <div className="score">
                <p className="score__figure">
                  <AnimatedNumber value={assigned.length} className="score__value" />
                  <span className="score__of">{assigned.length === 1 ? 'escenario asignado' : 'escenarios asignados'}</span>
                </p>
              </div>

              {assigned.length === 0 ? (
                <p className="empty-state">
                  {canAssign && tournament.active
                    ? 'Asigna el primero desde la lista de disponibles.'
                    : `${tournament.name} no tiene escenarios asignados.`}
                </p>
              ) : (
                <ul className="detail-list assoc__list">
                  {assigned.map(({ venue }) => {
                    const full = venueById.get(venue.id)
                    return (
                      <li key={venue.id} className="detail-list__item">
                        <VenuePhoto venue={full ?? venue} size="md" />
                        <span className="detail-list__name">
                          {canOpenVenues ? (
                            <a className="detail-list__link" href={`#escenarios/${venue.id}`}>
                              {venue.name}
                            </a>
                          ) : (
                            venue.name
                          )}
                          <span className="detail-list__detail">
                            {locationOf(venue)}
                            {full ? ` · ${seats(full.capacity)}` : ''}
                            {venue.available ? '' : ' · No disponible'}
                          </span>
                        </span>
                        {canWithdraw && (
                          <button
                            type="button"
                            className="button button--text row-actions__danger"
                            disabled={busy}
                            aria-label={`Retirar ${venue.name} de ${tournament.name}`}
                            onClick={() => withdraw(venue)}
                          >
                            <MapPinMinus size={16} aria-hidden="true" />
                            <span className="assoc__label">
                              {busyVenueId === venue.id ? 'Retirando…' : 'Retirar del torneo'}
                            </span>
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
          <p className="assoc__note">
            <Info size={16} aria-hidden="true" />
            Retirar un escenario no lo borra. No se puede retirar si el torneo tiene partidos programados o en juego
            ahí.
          </p>
        </section>
      </div>
      {confirmDialog}
      {toast}
    </div>
  )
}
