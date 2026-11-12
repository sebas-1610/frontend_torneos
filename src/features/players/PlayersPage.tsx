import { Ban, Eye, Pencil, Shirt, UserPlus, UserRoundCheck } from 'lucide-react'
import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { errorMessage } from '../../api/client'
import { deletePlayer, disablePlayer, enablePlayer, findPlayers, type Player } from '../../api/players'
import { findTeams } from '../../api/teams'
import { RESOURCES, useAccess } from '../../auth/access'
import type { ActionError } from '../../components/ActionAlert'
import { SubjectVisual } from '../../components/ConfirmDialog'
import { PlayerAvatar } from '../../components/PlayerAvatar'
import { ListPanel, ListToolbar, RowAction, RowActions, StatusPill, ToolbarButton } from '../../components/ListView'
import { PageHeading } from '../../components/PageHeading'
import { SortHeader } from '../../components/SortHeader'
import { TeamMonogram } from '../../components/TeamMonogram'
import { useConfirm } from '../../hooks/useConfirm'
import { useLoadList } from '../../hooks/useLoadList'
import { useSort } from '../../hooks/useSort'
import { useToast } from '../../hooks/useToast'
import { ageFrom } from '../../utils/dates'
import { plural } from '../../utils/plural'
import { revealIfStacked } from '../../utils/reveal'
import { normalize } from '../roles/labels'
import { PlayerDetail } from './PlayerDetail'
import { PlayerFormDialog } from './PlayerFormDialog'
import { fullNameOf } from './playerName'
import { positionCode, positionColor } from './position'

type StatusFilter = '' | 'activos' | 'inactivos'
type TeamFilter = number | 'sin-equipo' | null // null: todos
type SortKey = 'name' | 'age' | 'position' | 'team' | 'status'

// Qué se compara al ordenar por cada columna (useSort).
const SORT_VALUES: Record<SortKey, (player: Player) => string | number | null> = {
  name: fullNameOf,
  age: (player) => ageFrom(player.birthDate),
  position: (player) => player.position,
  team: (player) => player.currentTeams[0]?.name ?? null,
  status: (player) => (player.active ? 'Activo' : 'Inactivo'),
}

// Pantalla "Jugadores" (HU-GD-04): tabla con búsqueda, filtros de estado, equipo y deporte, y orden
// por columna; crear, editar, activar/desactivar y eliminar. A la derecha, el detalle del elegido.
export function PlayersPage() {
  const { can } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const { showToast, toast } = useToast()
  const canCreate = can(RESOURCES.players, 'CREATE')
  const canUpdate = can(RESOURCES.players, 'UPDATE')
  const canDelete = can(RESOURCES.players, 'DELETE')
  const canListTeams = can(RESOURCES.teams, 'LIST')

  const { items: players, setItems: setPlayers, loading, loadError, reload, retry } = useLoadList(findPlayers)
  // Los equipos traen sus deportes: con ellos se arma el filtro por deporte. Sin permiso para
  // listarlos, ese filtro no aparece y el de equipo se arma con los equipos de los jugadores.
  const { items: teams } = useLoadList(findTeams, canListTeams)
  const [actionError, setActionError] = useState<ActionError | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [teamFilter, setTeamFilter] = useState<TeamFilter>(null)
  const [sportId, setSportId] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Player | 'new' | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const detailRef = useRef<HTMLElement>(null)

  // Equipos que tienen al menos un jugador hoy.
  const teamOptions = useMemo(() => {
    const byId = new Map(players.flatMap((player) => player.currentTeams).map((team) => [team.id, team]))
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [players])

  // Deportes de esos equipos, y qué equipos juega cada deporte.
  const { sportOptions, teamsBySport } = useMemo(() => {
    const options = new Map<number, string>()
    const bySport = new Map<number, Set<number>>()
    const withPlayers = new Set(teamOptions.map((team) => team.id))
    for (const team of teams) {
      if (!withPlayers.has(team.id)) continue
      for (const sport of team.sports) {
        options.set(sport.id, sport.name)
        if (!bySport.has(sport.id)) bySport.set(sport.id, new Set())
        bySport.get(sport.id)?.add(team.id)
      }
    }
    return {
      sportOptions: [...options].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'es')),
      teamsBySport: bySport,
    }
  }, [teams, teamOptions])

  // El backend busca con ?search=, pero aquí ya está la lista completa: todo se filtra en el navegador
  // (nombre en cualquier orden o documento, sin tildes).
  const filtered = useMemo(() => {
    const text = normalize(query.trim())
    const sportTeams = sportId === null ? null : (teamsBySport.get(sportId) ?? new Set<number>())
    return players.filter((player) => {
      if (status !== '' && player.active !== (status === 'activos')) return false
      if (teamFilter === 'sin-equipo' && player.currentTeams.length > 0) return false
      if (typeof teamFilter === 'number' && !player.currentTeams.some((team) => team.id === teamFilter)) return false
      if (sportTeams && !player.currentTeams.some((team) => sportTeams.has(team.id))) return false
      if (!text) return true
      const first = normalize(player.firstName)
      const last = normalize(player.lastName)
      return (
        `${first} ${last}`.includes(text) ||
        `${last} ${first}`.includes(text) ||
        player.documentNumber.toLowerCase().includes(text)
      )
    })
  }, [players, query, status, teamFilter, sportId, teamsBySport])

  // Sin orden elegido quedan como llegan: por apellidos.
  const { sorted: visible, sort, toggleSort } = useSort(filtered, SORT_VALUES)

  // El elegido; si no hay (o quedó fuera de la lista), el primero que se ve.
  const selected = players.find((player) => player.id === selectedId) ?? visible[0] ?? null

  const activeCount = players.filter((player) => player.active).length
  const withTeam = players.filter((player) => player.currentTeams.length > 0).length
  const finding = loading
    ? 'Cargando jugadores…'
    : loadError
      ? 'No se pudo cargar la lista de jugadores.'
      : players.length === 0
        ? 'Todavía no hay jugadores registrados.'
        : `${plural(players.length, 'jugador registrado', 'jugadores registrados')}, ` +
          `${activeCount} ${activeCount === 1 ? 'activo' : 'activos'}. ` +
          `${withTeam} ${withTeam === 1 ? 'tiene' : 'tienen'} equipo hoy.`

  function select(playerId: number, reveal: boolean) {
    if (playerId !== selected?.id) setActionError(null)
    setSelectedId(playerId)
    if (reveal) revealIfStacked(() => detailRef.current)
  }

  function upsert(saved: Player) {
    setPlayers((list) =>
      list.some((player) => player.id === saved.id)
        ? list.map((player) => (player.id === saved.id ? saved : player))
        : [...list, saved],
    )
  }

  // Si el backend rechaza la acción, el aviso sale en el detalle: por eso la fila queda elegida.
  async function runAction(player: Player, failTitle: string, action: () => Promise<void>) {
    setSelectedId(player.id)
    setBusyId(player.id)
    setActionError(null)
    try {
      await action()
    } catch (err) {
      setActionError({ title: failTitle, message: errorMessage(err) })
      revealIfStacked(() => detailRef.current)
    } finally {
      setBusyId(null)
    }
  }

  function subjectOf(player: Player) {
    return (
      <SubjectVisual
        visual={<PlayerAvatar player={player} size="sm" />}
        name={fullNameOf(player)}
        detail={`${player.documentType} ${player.documentNumber}`}
      />
    )
  }

  async function toggleActive(player: Player) {
    const name = fullNameOf(player)
    if (player.active) {
      const confirmed = await confirm({
        title: `¿Desactivar a ${name}?`,
        message:
          'No se le podrán asignar equipos ni habilidades nuevas. ' +
          'Sus contratos y sus habilidades actuales se conservan.',
        confirmLabel: 'Desactivar jugador',
        tone: 'neutral',
        subject: subjectOf(player),
      })
      if (!confirmed) return
    }
    const failTitle = player.active ? 'No se pudo desactivar al jugador' : 'No se pudo activar al jugador'
    await runAction(player, failTitle, async () => {
      const saved = await (player.active ? disablePlayer(player.id) : enablePlayer(player.id))
      upsert(saved)
      showToast(saved.active ? `${name} quedó activo.` : `${name} quedó desactivado.`)
    })
  }

  async function remove(player: Player) {
    const name = fullNameOf(player)
    const confirmed = await confirm({
      title: `¿Eliminar a ${name}?`,
      message:
        'Se borra del sistema. Si tiene historial de contratos con equipos o habilidades asignadas ' +
        'no se puede eliminar: en ese caso, desactívalo.',
      confirmLabel: 'Eliminar jugador',
      subject: subjectOf(player),
    })
    if (!confirmed) return
    await runAction(player, 'No se puede eliminar al jugador', async () => {
      await deletePlayer(player.id) // 400 con el motivo si tiene contratos o habilidades (HU-GD-04)
      setPlayers((list) => list.filter((item) => item.id !== player.id))
      showToast(`Se eliminó a ${name}.`)
    })
  }

  return (
    <div className="page page--vivid">
      <PageHeading icon={Shirt} title="Jugadores" finding={finding} />

      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Buscar por nombre o documento"
        actions={
          canCreate && <ToolbarButton primary icon={UserPlus} label="Nuevo jugador" onClick={() => setEditing('new')} />
        }
      >
        <select
          aria-label="Filtrar por estado"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
        >
          <option value="">Todos los estados</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </select>
        <select
          aria-label="Filtrar por equipo"
          value={teamFilter ?? ''}
          onChange={(e) => {
            const value = e.target.value
            setTeamFilter(value === '' ? null : value === 'sin-equipo' ? value : Number(value))
          }}
        >
          <option value="">Todos los equipos</option>
          <option value="sin-equipo">Sin equipo</option>
          {teamOptions.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        {sportOptions.length > 0 && (
          <select
            aria-label="Filtrar por deporte"
            value={sportId ?? ''}
            onChange={(e) => setSportId(e.target.value === '' ? null : Number(e.target.value))}
          >
            <option value="">Todos los deportes</option>
            {sportOptions.map((sport) => (
              <option key={sport.id} value={sport.id}>
                {sport.name}
              </option>
            ))}
          </select>
        )}
      </ListToolbar>

      <div className="page__grid">
        <ListPanel
          title="Lista de jugadores"
          titleId="players-list-title"
          noun={['jugador', 'jugadores']}
          total={players.length}
          shown={visible.length}
          loading={loading}
          loadError={loadError}
          onRetry={retry}
          emptyMessage={
            visible.length > 0
              ? null
              : players.length === 0
                ? canCreate
                  ? 'No hay jugadores registrados. Crea el primero con "Nuevo jugador".'
                  : 'No hay jugadores registrados.'
                : 'Ningún jugador coincide con los filtros.'
          }
        >
          <div className="table-scroll">
            <table className="data-table data-table--select data-table--rows">
              <thead>
                <tr>
                  <SortHeader label="Jugador" sortKey="name" sort={sort} onSort={toggleSort} />
                  <SortHeader
                    label="Edad"
                    sortKey="age"
                    sort={sort}
                    onSort={toggleSort}
                    className="data-table__optional"
                  />
                  <SortHeader
                    label="Posición"
                    sortKey="position"
                    sort={sort}
                    onSort={toggleSort}
                    className="data-table__optional"
                  />
                  <SortHeader
                    label="Equipo actual"
                    sortKey="team"
                    sort={sort}
                    onSort={toggleSort}
                    className="data-table__optional"
                  />
                  <SortHeader
                    label="Estado"
                    sortKey="status"
                    sort={sort}
                    onSort={toggleSort}
                    className="data-table__optional"
                  />
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((player) => {
                  const name = fullNameOf(player)
                  const busy = busyId === player.id
                  const isSelected = player.id === selected?.id
                  const [team, ...otherTeams] = player.currentTeams
                  return (
                    <tr
                      key={player.id}
                      className={`${isSelected ? 'is-selected' : ''}${player.active ? '' : ' is-inactive'}`}
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={() => select(player.id, false)}
                    >
                      <td className="data-table__name">
                        <span className="role-cell">
                          <PlayerAvatar player={player} />
                          {/* El documento va debajo del nombre: como columna aparte, la tabla no cabe. */}
                          <span className="cell-lines">
                            <span className="data-table__strong">{name}</span>
                            <span className="cell-lines__detail">
                              {player.documentType} {player.documentNumber}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="data-table__optional">
                        <span className="data-table__figure">{ageFrom(player.birthDate)}</span>
                      </td>
                      <td className="data-table__optional">
                        {player.position ? (
                          <span
                            className="tag"
                            title={player.position}
                            style={{ '--tag': positionColor(player.position) } as CSSProperties}
                          >
                            {positionCode(player.position)}
                          </span>
                        ) : (
                          <span className="dash">—</span>
                        )}
                      </td>
                      <td className="data-table__optional data-table__name">
                        {team ? (
                          <span className="role-cell" title={player.currentTeams.map((item) => item.name).join(', ')}>
                            <TeamMonogram team={team} size="sm" />
                            <span className="cell-lines">{team.name}</span>
                            {otherTeams.length > 0 && <span className="sport-stack__more">+{otherTeams.length}</span>}
                          </span>
                        ) : (
                          <span className="dash">Sin equipo</span>
                        )}
                      </td>
                      <td className="data-table__optional">
                        <StatusPill active={player.active} />
                      </td>
                      <RowActions>
                        <RowAction
                          icon={Eye}
                          title="Ver"
                          label={`Ver a ${name}`}
                          onClick={() => select(player.id, true)}
                        />
                        {canUpdate && (
                          <RowAction
                            icon={Pencil}
                            title="Editar"
                            label={`Editar a ${name}`}
                            disabled={busy}
                            onClick={() => setEditing(player)}
                          />
                        )}
                        {/* Como en el mockup, el tercero desactiva; eliminar está en el detalle. */}
                        {canUpdate && (
                          <RowAction
                            icon={player.active ? Ban : UserRoundCheck}
                            tone={player.active ? 'red' : 'green'}
                            title={player.active ? 'Desactivar' : 'Activar'}
                            label={`${player.active ? 'Desactivar' : 'Activar'} a ${name}`}
                            disabled={busy}
                            onClick={() => toggleActive(player)}
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

        <PlayerDetail
          ref={detailRef}
          player={loading || loadError ? null : selected}
          emptyMessage={
            loading
              ? 'Cargando jugadores…'
              : loadError
                ? 'Cuando la lista cargue, aquí verás el detalle del jugador elegido.'
                : players.length === 0
                  ? 'Cuando registres un jugador, aquí verás su foto, sus datos y su equipo.'
                  : 'Ningún jugador coincide con los filtros.'
          }
          busy={selected !== null && busyId === selected.id}
          error={actionError}
          onDismissError={() => setActionError(null)}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onEdit={setEditing}
          onToggleActive={toggleActive}
          onDelete={remove}
        />
      </div>

      {editing && (
        <PlayerFormDialog
          player={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved, isNew) => {
            setEditing(null)
            upsert(saved)
            setSelectedId(saved.id)
            setActionError(null)
            showToast(isNew ? `${fullNameOf(saved)} quedó registrado.` : 'Cambios guardados.')
            reload() // el backend los ordena por apellidos
          }}
        />
      )}
      {confirmDialog}
      {toast}
    </div>
  )
}
