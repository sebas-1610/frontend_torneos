import { CalendarCheck, CalendarClock, CalendarDays, Info, Tag, Users, VenusAndMars } from 'lucide-react'
import { useCallback, type CSSProperties, type Ref } from 'react'
import { findTournamentDevelopment } from '../../api/development'
import { findMatchesByTournament } from '../../api/matches'
import { findPhasesByTournament } from '../../api/phases'
import type { Sport } from '../../api/sports'
import { findRegistrationsByTournament } from '../../api/tournamentTeams'
import type { Tournament } from '../../api/tournaments'
import { canOpenPage, RESOURCES, useAccess } from '../../auth/access'
import type { ActionError } from '../../components/ActionAlert'
import {
  DetailActions,
  DetailHero,
  DetailMain,
  DetailPanel,
  DetailSection,
  DetailSide,
  ShortcutTile,
  ShortcutTiles,
  StatTile,
  StatTiles,
} from '../../components/DetailPanel'
import { StatusPill } from '../../components/ListView'
import { SportIcon } from '../../components/SportIcon'
import { TeamMonogram } from '../../components/TeamMonogram'
import { TournamentBadge } from '../../components/TournamentBadge'
import { useLoad } from '../../hooks/useLoad'
import { useLoadList } from '../../hooks/useLoadList'
import { formatDateShort } from '../../utils/dates'
import { hueFor } from '../../utils/hue'
import { developmentShort } from '../development/developmentInfo'
import { matchesShort } from '../matches/matchInfo'
import { PhaseTrail } from '../phases/PhaseTrail'
import { phasesShort } from '../phases/phaseInfo'
import { kindOfSummary } from '../sports/sportKind'
import { categoryLabel, durationDays, registrationShort, STATUSES } from './tournamentInfo'
import { screenHref, TOURNAMENT_SCREENS, type TournamentScreenId } from './tournamentScreens'
import './Tournaments.css'

interface TournamentDetailProps {
  ref?: Ref<HTMLElement>
  tournament: Tournament | null // null: no hay torneos que mostrar
  sports: Sport[] // para el balón del deporte (vacía si la sesión no puede listar deportes)
  emptyMessage: string
  busy: boolean
  error: ActionError | null // la última acción rechazada (ej: no se puede eliminar porque tiene fases)
  onDismissError: () => void
  canUpdate: boolean
  canDelete: boolean
  onEdit: (tournament: Tournament) => void
  onToggleActive: (tournament: Tournament) => void
  onDelete: (tournament: Tournament) => void
}

// Panel derecho de Torneos: el torneo elegido con sus fechas, los accesos a sus pantallas
// (Inscripciones, Fases y grupos, Partidos), sus cifras, sus fases y los equipos inscritos.
export function TournamentDetail({
  ref,
  tournament,
  sports,
  emptyMessage,
  busy,
  error,
  onDismissError,
  canUpdate,
  canDelete,
  onEdit,
  onToggleActive,
  onDelete,
}: TournamentDetailProps) {
  if (!tournament) {
    return <DetailPanel ref={ref} label="Detalle del torneo" icon={Info} emptyMessage={emptyMessage} />
  }

  return (
    <DetailPanel
      ref={ref}
      label="Detalle del torneo"
      icon={Info}
      titleId="tournament-detail-title"
      emptyMessage={null}
      error={error}
      onDismissError={onDismissError}
    >
      {/* La key vuelve a cargar las fases al cambiar de torneo. */}
      <TournamentBody key={tournament.id} tournament={tournament} sports={sports} />
      <DetailActions
        noun="torneo"
        active={tournament.active}
        busy={busy}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onEdit={() => onEdit(tournament)}
        onToggleActive={() => onToggleActive(tournament)}
        onDelete={() => onDelete(tournament)}
      />
    </DetailPanel>
  )
}

interface TournamentBodyProps {
  tournament: Tournament
  sports: Sport[]
}

// Lo que se ve del torneo elegido. Carga sus fases una vez (las usan la tarjeta "Fases y grupos" y la
// sección "Fases"), sus partidos (para la tarjeta "Partidos") y su desarrollo (para "Desarrollo").
function TournamentBody({ tournament, sports }: TournamentBodyProps) {
  const { can } = useAccess()
  const canListPhases = can(RESOURCES.phases, 'LIST')
  const fetchPhases = useCallback(() => findPhasesByTournament(tournament.id), [tournament.id])
  const phasesList = useLoadList(fetchPhases, canListPhases)
  // Solo las pantallas que la sesión puede abrir.
  const screens = TOURNAMENT_SCREENS.filter((screen) => canOpenPage(screen.page, can))
  // Para el dato de la tarjeta "Partidos".
  const fetchMatches = useCallback(() => findMatchesByTournament(tournament.id), [tournament.id])
  const matchesList = useLoadList(fetchMatches, canOpenPage('torneos-partidos', can))
  // Para el dato de la tarjeta "Desarrollo": cuánto lleva y en qué fase va.
  const fetchDevelopment = useCallback(() => findTournamentDevelopment(tournament.id), [tournament.id])
  const developmentLoad = useLoad(fetchDevelopment, canOpenPage('torneos-desarrollo', can))

  const teams = tournament.teamsCount
  const days = durationDays(tournament)
  const status = STATUSES[tournament.status]

  // El dato vivo de cada tarjeta.
  function detailOf(page: TournamentScreenId): { text: string; className?: string } {
    switch (page) {
      case 'torneos-inscripciones':
        return {
          text: registrationShort(tournament),
          className: tournament.registrationOpen ? 'registration-state is-open' : undefined,
        }
      case 'torneos-fases':
        return {
          text: phasesList.loading
            ? 'Cargando fases…'
            : phasesList.loadError
              ? 'No se pudieron cargar las fases'
              : phasesShort(phasesList.items),
        }
      case 'torneos-partidos':
        return {
          text: matchesList.loading
            ? 'Cargando partidos…'
            : matchesList.loadError
              ? 'No se pudieron cargar los partidos'
              : matchesShort(matchesList.items),
        }
      case 'torneos-desarrollo':
        return {
          text: developmentLoad.loading
            ? 'Cargando el desarrollo…'
            : developmentLoad.loadError || !developmentLoad.data
              ? 'No se pudo cargar el desarrollo'
              : developmentShort(developmentLoad.data.summary),
        }
    }
  }

  return (
    <>
      <DetailMain>
        <DetailHero
          glow={`hsl(${hueFor(tournament.id)} 65% 48%)`}
          visual={<TournamentBadge tournament={tournament} size="xl" />}
        >
          <h3 id="tournament-detail-title" className="hero__name">
            {tournament.name}
          </h3>
          <span className="hero__tags">
            <span className="tag" style={{ '--tag': status.tone } as CSSProperties}>
              {status.label}
            </span>
            {!tournament.active && <StatusPill active={false} />}
          </span>
          <ul className="hero__facts">
            <li>
              <Tag size={14} aria-hidden="true" />
              <span>
                Deporte: <strong>{tournament.sport.name}</strong>
              </span>
            </li>
            <li>
              <VenusAndMars size={14} aria-hidden="true" />
              <span>
                Categoría: <strong>{categoryLabel(tournament.category)}</strong>
              </span>
            </li>
            <li>
              <CalendarDays size={14} aria-hidden="true" />
              <span>
                Inicio: <strong>{formatDateShort(tournament.startDate)}</strong>
              </span>
            </li>
            <li>
              <CalendarCheck size={14} aria-hidden="true" />
              <span>
                Final estimada: <strong>{formatDateShort(tournament.endDate)}</strong>
              </span>
            </li>
          </ul>
        </DetailHero>

        {/* Justo debajo del encabezado, para que se vean apenas se elige el torneo (pedido del usuario). */}
        {screens.length > 0 && (
          <ShortcutTiles label={`Pantallas de ${tournament.name}`}>
            {screens.map((screen) => {
              const detail = detailOf(screen.page)
              return (
                <ShortcutTile
                  key={screen.page}
                  icon={screen.icon}
                  tone={screen.tone}
                  title={screen.label}
                  detail={detail.text}
                  detailClassName={detail.className}
                  href={screenHref(screen.page, tournament.id)}
                />
              )
            })}
          </ShortcutTiles>
        )}

        <StatTiles>
          <StatTile
            icon={Users}
            tone="--tone-blue"
            value={teams}
            label={teams === 1 ? 'Equipo inscrito' : 'Equipos inscritos'}
          />
          <StatTile
            icon={CalendarClock}
            tone="--tone-amber"
            value={days}
            label={days === 1 ? 'Día de competencia' : 'Días de competencia'}
          />
        </StatTiles>
      </DetailMain>

      <DetailSide>
        <DetailSection title="Deporte">
          <ul className="chip-list">
            <li className={`chip${tournament.sport.active ? '' : ' is-inactive'}`}>
              <SportIcon kind={kindOfSummary(tournament.sport, sports)} id={tournament.sport.id} size={18} />
              {tournament.sport.name}
              {!tournament.sport.active && ' (desactivado)'}
            </li>
          </ul>
        </DetailSection>

        {canListPhases && (
          <PhaseTrail
            tournamentName={tournament.name}
            phases={phasesList.items}
            loading={phasesList.loading}
            loadError={phasesList.loadError}
          />
        )}

        {can(RESOURCES.registrations, 'LIST') && (
          // La key vuelve a pedir los equipos al cambiar de cantidad de inscritos.
          <RegisteredTeams key={teams} tournament={tournament} />
        )}
      </DetailSide>
    </>
  )
}

// Equipos que se ven en el detalle; el resto se resume como "y 4 más".
const MAX_TEAMS = 12

// Los equipos inscritos en el torneo (HU-GC-02: consultar los equipos de un torneo).
function RegisteredTeams({ tournament }: { tournament: Tournament }) {
  const fetchRegistrations = useCallback(() => findRegistrationsByTournament(tournament.id), [tournament.id])
  const { items: registrations, loading, loadError } = useLoadList(fetchRegistrations)
  const hidden = registrations.length - MAX_TEAMS

  return (
    <DetailSection title="Equipos inscritos">
      {loading ? (
        <p className="detail__empty">Cargando equipos…</p>
      ) : loadError ? (
        <p className="detail__empty">No se pudieron cargar los equipos: {loadError}</p>
      ) : registrations.length === 0 ? (
        <p className="detail__empty">{tournament.name} todavía no tiene equipos inscritos.</p>
      ) : (
        <>
          <ul className="chip-list">
            {registrations.slice(0, MAX_TEAMS).map(({ team }) => (
              <li key={team.id} className={`chip${team.active ? '' : ' is-inactive'}`}>
                <TeamMonogram team={team} size="sm" />
                {team.name}
              </li>
            ))}
          </ul>
          {hidden > 0 && <p className="detail__empty detail__note">Y {hidden} más.</p>}
        </>
      )}
    </DetailSection>
  )
}
