import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  CircleAlert,
  CircleMinus,
  Eye,
  History,
  Info,
  MapPin,
  Shield,
  UserPlus,
  Users,
} from 'lucide-react'
import { useCallback, useMemo, useState, type CSSProperties } from 'react'
import { errorMessage } from '../../api/client'
import { findPlayers, type Player, type PlayerSummary } from '../../api/players'
import { effectiveEnd, findContractsByTeam, isOpen, retireContract, type Contract } from '../../api/teamPlayers'
import { findTeams, type Team } from '../../api/teams'
import { RESOURCES, useAccess } from '../../auth/access'
import type { ActionError } from '../../components/ActionAlert'
import { SubjectBreak, SubjectVisual } from '../../components/ConfirmDialog'
import {
  DetailHero,
  DetailMain,
  DetailPanel,
  DetailSection,
  DetailSide,
  StatTile,
  StatTiles,
} from '../../components/DetailPanel'
import { ListPanel, RowAction, RowActions, StatusPill } from '../../components/ListView'
import { PageHeading } from '../../components/PageHeading'
import { PlayerAvatar } from '../../components/PlayerAvatar'
import { SortHeader } from '../../components/SortHeader'
import { TeamMonogram } from '../../components/TeamMonogram'
import { TeamPicker } from '../../components/TeamPicker'
import { useConfirm } from '../../hooks/useConfirm'
import { useLoadList } from '../../hooks/useLoadList'
import { useSort } from '../../hooks/useSort'
import { useToast } from '../../hooks/useToast'
import { ageFrom, formatDateShort } from '../../utils/dates'
import { hueFor } from '../../utils/hue'
import { plural } from '../../utils/plural'
import { fullNameOf } from '../players/playerName'
import { positionCode, positionColor } from '../players/position'
import { AssignPlayerDialog } from './AssignPlayerDialog'
import { contractPeriod, contractReason } from './contractInfo'

// La URL dice qué equipo está abierto (#equipos-plantilla/{id}): al recargar se abre el mismo.
function showTeamInUrl(teamId: number) {
  window.history.replaceState(null, '', `#equipos-plantilla/${teamId}`)
}

interface TeamRosterPageProps {
  initialTeamId: number | null // equipo pedido en la URL, por ejemplo desde "Plantilla" en Equipos
}

// Pantalla "Plantilla del equipo" (HU-GD-05): se elige un equipo y se ven sus jugadores actuales y su
// historial; desde aquí se asigna un jugador (un contrato con fechas) o se retira.
export function TeamRosterPage({ initialTeamId }: TeamRosterPageProps) {
  const { can } = useAccess()
  const canListPlayers = can(RESOURCES.players, 'LIST')
  const teamsList = useLoadList(findTeams)
  // Los jugadores dan la foto, la edad y entre quiénes elegir al asignar. Sin ese permiso, la plantilla
  // se ve con iniciales y no se puede asignar.
  const playersList = useLoadList(findPlayers, canListPlayers)
  const teams = teamsList.items
  const [teamId, setTeamId] = useState<number | null>(initialTeamId)

  // El de la URL; si no hay o ya no existe, el primero activo (o el primero).
  const team = teams.find((item) => item.id === teamId) ?? teams.find((item) => item.active) ?? teams[0] ?? null

  if (teamsList.loadError || teamsList.loading || !team) {
    return (
      <div className="page page--vivid">
        <PageHeading
          icon={Users}
          title="Plantilla del equipo"
          finding={
            teamsList.loadError
              ? 'No se pudieron cargar los equipos.'
              : teamsList.loading
                ? 'Cargando equipos…'
                : 'Todavía no hay equipos registrados.'
          }
        >
          <BackToTeams />
        </PageHeading>
        <section className="panel" aria-busy={teamsList.loading}>
          {teamsList.loadError ? (
            <div className="inline-error" role="alert">
              <CircleAlert size={16} aria-hidden="true" />
              <span>{teamsList.loadError}</span>
              <button type="button" className="text-action" onClick={teamsList.retry}>
                Reintentar
              </button>
            </div>
          ) : (
            <p className="empty-state">
              {teamsList.loading ? 'Cargando equipos…' : 'Primero registra un equipo en la pantalla Equipos.'}
            </p>
          )}
        </section>
      </div>
    )
  }

  return (
    // La key vuelve a montar la plantilla al cambiar de equipo: carga sus contratos desde cero.
    <Roster
      key={team.id}
      team={team}
      teams={teams}
      players={playersList.items}
      canListPlayers={canListPlayers}
      onChooseTeam={(id) => {
        setTeamId(id)
        showTeamInUrl(id)
      }}
      onChanged={() => {
        teamsList.reload() // cuántos jugadores tiene cada equipo
        playersList.reload() // y el equipo actual de cada jugador
      }}
    />
  )
}

function BackToTeams() {
  return (
    <a className="button button--outline" href="#equipos">
      <ArrowLeft size={18} aria-hidden="true" />
      Volver a Equipos
    </a>
  )
}

type CurrentKey = 'player' | 'position' | 'start' | 'end' | 'status'
type HistoryKey = 'player' | 'end' | 'reason'

const lastFirst = (player: PlayerSummary) => `${player.lastName} ${player.firstName}`

// Qué se compara al ordenar por cada columna (useSort). Las fechas "AAAA-MM-DD" ordenan bien como texto.
const CURRENT_VALUES: Record<CurrentKey, (contract: Contract) => string | null> = {
  player: (contract) => lastFirst(contract.player),
  position: (contract) => contract.player.position,
  start: (contract) => contract.startDate,
  end: (contract) => contract.endDate,
  status: (contract) => (contract.status === 'VIGENTE' ? 'Vigente' : 'Por empezar'),
}

const HISTORY_VALUES: Record<HistoryKey, (contract: Contract) => string | null> = {
  player: (contract) => lastFirst(contract.player),
  end: (contract) => effectiveEnd(contract),
  reason: (contract) => contractReason(contract).label,
}

interface RosterProps {
  team: Team
  teams: Team[]
  players: Player[]
  canListPlayers: boolean
  onChooseTeam: (teamId: number) => void
  onChanged: () => void
}

function Roster({ team, teams, players, canListPlayers, onChooseTeam, onChanged }: RosterProps) {
  const { can } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const { showToast, toast } = useToast()
  const canAssign = can(RESOURCES.contracts, 'CREATE') && canListPlayers
  const canRetire = can(RESOURCES.contracts, 'UPDATE')

  const fetchContracts = useCallback(() => findContractsByTeam(team.id), [team.id])
  const { items: contracts, loading, loadError, reload, retry } = useLoadList(fetchContracts)
  const [assigning, setAssigning] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<ActionError | null>(null)

  // Con foto, fecha de nacimiento y equipos actuales (el contrato trae al jugador sin foto).
  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players])
  const activePlayers = useMemo(() => players.filter((player) => player.active), [players])

  // Actuales: vigentes y por empezar. Historial: finalizados y retirados, del más reciente al más antiguo.
  const open = useMemo(() => contracts.filter(isOpen), [contracts])
  const closed = useMemo(
    () =>
      contracts.filter((contract) => !isOpen(contract)).sort((a, b) => effectiveEnd(b).localeCompare(effectiveEnd(a))),
    [contracts],
  )
  const current = useSort(open, CURRENT_VALUES)
  const history = useSort(closed, HISTORY_VALUES)

  // Cifras del detalle. El mismo jugador solo cuenta una vez.
  const inSquad = new Set(
    open.filter((contract) => contract.status === 'VIGENTE').map((contract) => contract.player.id),
  )
  const upcoming = open.filter((contract) => contract.status === 'FUTURO').length
  const ages = [...inSquad].flatMap((id) => {
    const player = playersById.get(id)
    return player ? [ageFrom(player.birthDate)] : []
  })
  const averageAge = ages.length > 0 ? ages.reduce((sum, age) => sum + age, 0) / ages.length : null

  const finding = loading
    ? 'Cargando la plantilla…'
    : loadError
      ? 'No se pudo cargar la plantilla.'
      : open.length === 0
        ? `${team.name} todavía no tiene jugadores en su plantilla.`
        : `${team.name} tiene ${plural(inSquad.size, 'jugador', 'jugadores')} en plantilla` +
          (upcoming > 0 ? ` y ${plural(upcoming, 'contrato por empezar', 'contratos por empezar')}.` : '.')

  function playerOf(contract: Contract): Player | PlayerSummary {
    return playersById.get(contract.player.id) ?? contract.player
  }

  async function retire(contract: Contract) {
    const name = fullNameOf(contract.player)
    const upcomingContract = contract.status === 'FUTURO'
    const confirmed = await confirm({
      title: upcomingContract ? `¿Cancelar el contrato de ${name}?` : `¿Retirar a ${name} de ${team.name}?`,
      message: upcomingContract
        ? 'El contrato todavía no empieza: al retirarlo queda cancelado y pasa al historial.'
        : 'El jugador dejará de pertenecer a la plantilla actual, pero su vinculación queda registrada en el historial.',
      confirmLabel: upcomingContract ? 'Cancelar contrato' : 'Retirar del equipo',
      subject: (
        <>
          <SubjectVisual
            visual={<PlayerAvatar player={playerOf(contract)} size="sm" />}
            name={name}
            detail={`Contrato del ${formatDateShort(contract.startDate)} al ${formatDateShort(contract.endDate)}`}
          />
          <SubjectBreak />
          <SubjectVisual visual={<TeamMonogram team={team} size="sm" />} name={team.name} detail="Equipo" />
        </>
      ),
    })
    if (!confirmed) return
    setBusyId(contract.id)
    setActionError(null)
    try {
      await retireContract(contract.id)
      showToast(upcomingContract ? `Se canceló el contrato de ${name}.` : `${name} ya no está en la plantilla.`)
      reload()
      onChanged()
    } catch (err) {
      // ej: 400 si el contrato terminó o ya lo retiró otra persona
      setActionError({ title: `No se pudo retirar a ${name}`, message: errorMessage(err) })
      reload()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page page--vivid">
      <PageHeading icon={Users} title="Plantilla del equipo" finding={finding}>
        <BackToTeams />
      </PageHeading>

      <TeamPicker teams={teams} team={team} onChoose={onChooseTeam}>
        {canAssign && (
          <button
            type="button"
            className="button button--primary"
            disabled={!team.active || loading || loadError !== null}
            title={team.active ? undefined : 'Activa el equipo en Equipos para asignarle jugadores'}
            onClick={() => setAssigning(true)}
          >
            <UserPlus size={18} aria-hidden="true" />
            Asignar jugador
          </button>
        )}
      </TeamPicker>

      <div className="page__grid">
        <div className="page__main">
          <ListPanel
            title="Jugadores actuales"
            titleId="roster-current-title"
            icon={Users}
            noun={['jugador', 'jugadores']}
            total={open.length}
            shown={open.length}
            loading={loading}
            loadError={loadError}
            onRetry={retry}
            emptyMessage={
              open.length > 0
                ? null
                : !team.active
                  ? `${team.name} está desactivado: actívalo en Equipos para asignarle jugadores.`
                  : canAssign
                    ? `${team.name} no tiene jugadores. Asigna el primero con "Asignar jugador".`
                    : `${team.name} no tiene jugadores en su plantilla.`
            }
            error={actionError}
            onDismissError={() => setActionError(null)}
          >
            <div className="table-scroll">
              <table className="data-table data-table--rows">
                <thead>
                  <tr>
                    <SortHeader label="Jugador" sortKey="player" sort={current.sort} onSort={current.toggleSort} />
                    <SortHeader
                      label="Posición"
                      sortKey="position"
                      sort={current.sort}
                      onSort={current.toggleSort}
                      className="data-table__optional"
                    />
                    <SortHeader
                      label="Fecha inicio"
                      sortKey="start"
                      sort={current.sort}
                      onSort={current.toggleSort}
                      className="data-table__optional"
                    />
                    <SortHeader
                      label="Fecha fin"
                      sortKey="end"
                      sort={current.sort}
                      onSort={current.toggleSort}
                      className="data-table__optional"
                    />
                    <SortHeader label="Contrato" sortKey="status" sort={current.sort} onSort={current.toggleSort} />
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {current.sorted.map((contract) => {
                    const name = fullNameOf(contract.player)
                    const { position } = contract.player
                    return (
                      <tr key={contract.id}>
                        <td className="data-table__name">
                          <PlayerCell player={playerOf(contract)} />
                        </td>
                        <td className="data-table__optional">
                          {position ? (
                            <span
                              className="tag"
                              title={position}
                              style={{ '--tag': positionColor(position) } as CSSProperties}
                            >
                              {positionCode(position)}
                            </span>
                          ) : (
                            <span className="dash">—</span>
                          )}
                        </td>
                        <td className="data-table__optional num">{formatDateShort(contract.startDate)}</td>
                        <td className="data-table__optional num">{formatDateShort(contract.endDate)}</td>
                        <td>
                          <StatusPill
                            active={contract.status === 'VIGENTE'}
                            activeLabel="Vigente"
                            inactiveLabel="Por empezar"
                          />
                        </td>
                        <RowActions>
                          {canListPlayers && (
                            <RowAction
                              icon={Eye}
                              title="Ver jugador"
                              label={`Ver a ${name} en Jugadores`}
                              href={`#jugadores/${contract.player.id}`}
                            />
                          )}
                          {canRetire && (
                            <RowAction
                              icon={CircleMinus}
                              tone="red"
                              title={contract.status === 'FUTURO' ? 'Cancelar contrato' : 'Retirar del equipo'}
                              label={`Retirar a ${name} de ${team.name}`}
                              disabled={busyId !== null}
                              onClick={() => retire(contract)}
                            />
                          )}
                        </RowActions>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </ListPanel>

          <ListPanel
            title="Historial de jugadores"
            titleId="roster-history-title"
            icon={History}
            noun={['registro', 'registros']}
            total={closed.length}
            shown={closed.length}
            loading={loading}
            loadError={loadError}
            onRetry={retry}
            emptyMessage={
              closed.length > 0 ? null : 'Aquí quedan los contratos que terminan y los jugadores que se retiran.'
            }
          >
            <div className="table-scroll">
              <table className="data-table data-table--rows">
                <thead>
                  <tr>
                    <SortHeader label="Jugador" sortKey="player" sort={history.sort} onSort={history.toggleSort} />
                    <th className="data-table__optional">Período</th>
                    <SortHeader
                      label="Fecha fin"
                      sortKey="end"
                      sort={history.sort}
                      onSort={history.toggleSort}
                      className="data-table__optional"
                    />
                    <SortHeader label="Motivo" sortKey="reason" sort={history.sort} onSort={history.toggleSort} />
                    <th className="data-table__optional">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {history.sorted.map((contract) => {
                    const reason = contractReason(contract)
                    return (
                      <tr key={contract.id}>
                        <td className="data-table__name">
                          <PlayerCell player={playerOf(contract)} />
                        </td>
                        <td className="data-table__optional num">{contractPeriod(contract)}</td>
                        <td className="data-table__optional num">{formatDateShort(effectiveEnd(contract))}</td>
                        <td>
                          <span className="tag" style={{ '--tag': reason.tone } as CSSProperties}>
                            {reason.label}
                          </span>
                        </td>
                        <td className="data-table__optional data-table__wrap">{reason.detail}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </ListPanel>
        </div>

        <DetailPanel label="Detalle del equipo" icon={Info} titleId="roster-team-title" emptyMessage={null}>
          <DetailMain>
            <DetailHero glow={`hsl(${hueFor(team.id)} 65% 48%)`} visual={<TeamMonogram team={team} size="xl" />}>
              <h3 id="roster-team-title" className="hero__name">
                {team.name}
              </h3>
              <StatusPill active={team.active} />
              <ul className="hero__facts">
                <li>
                  <MapPin size={14} aria-hidden="true" />
                  <span>
                    Ciudad: <strong>{team.city}</strong>
                  </span>
                </li>
                <li>
                  <CalendarDays size={14} aria-hidden="true" />
                  <span>
                    Fundación:{' '}
                    <strong>{team.foundationDate ? formatDateShort(team.foundationDate) : 'sin fecha'}</strong>
                  </span>
                </li>
              </ul>
            </DetailHero>

            <StatTiles>
              <StatTile
                icon={Users}
                tone="--tone-blue"
                value={inSquad.size}
                label={inSquad.size === 1 ? 'Jugador en plantilla' : 'Jugadores en plantilla'}
              />
              <StatTile
                icon={CalendarClock}
                tone="--tone-amber"
                value={upcoming}
                label={upcoming === 1 ? 'Contrato por empezar' : 'Contratos por empezar'}
              />
            </StatTiles>
          </DetailMain>

          <DetailSide>
            <dl className="facts facts--icons">
              <div>
                <dt>
                  <CalendarDays size={16} aria-hidden="true" />
                  Promedio de edad
                </dt>
                <dd>
                  {averageAge === null ? (
                    <span className="dash">—</span>
                  ) : (
                    `${averageAge.toFixed(1).replace('.', ',')} años`
                  )}
                </dd>
              </div>
              <div>
                <dt>
                  <History size={16} aria-hidden="true" />
                  En el historial
                </dt>
                <dd>{plural(closed.length, 'registro', 'registros')}</dd>
              </div>
            </dl>

            <DetailSection title="Descripción">
              <p className="detail-section__text">{team.description ?? 'Sin descripción.'}</p>
            </DetailSection>
          </DetailSide>

          <div className="detail-cols__actions">
            <a className="button button--tint button--tint-blue detail__wide" href={`#equipos/${team.id}`}>
              <Shield size={16} aria-hidden="true" />
              Ver en Equipos
            </a>
          </div>
        </DetailPanel>
      </div>

      {assigning && (
        <AssignPlayerDialog
          team={team}
          players={activePlayers}
          contracts={contracts}
          onClose={() => setAssigning(false)}
          onSaved={(contract) => {
            setAssigning(false)
            setActionError(null)
            showToast(
              contract.status === 'FUTURO'
                ? `${fullNameOf(contract.player)} entrará a ${team.name} el ${formatDateShort(contract.startDate)}.`
                : `${fullNameOf(contract.player)} quedó en la plantilla de ${team.name}.`,
            )
            reload()
            onChanged()
          }}
        />
      )}
      {confirmDialog}
      {toast}
    </div>
  )
}

// Un jugador en una fila: su foto (o iniciales), su nombre y su documento.
function PlayerCell({ player }: { player: Player | PlayerSummary }) {
  return (
    <span className="role-cell">
      <PlayerAvatar player={player} />
      <span className="cell-lines">
        <span className="data-table__strong">{fullNameOf(player)}</span>
        <span className="cell-lines__detail">
          {player.documentType} {player.documentNumber}
        </span>
      </span>
    </span>
  )
}
