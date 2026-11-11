import { CircleAlert, Eye, List, MapPin, Pencil, Plus, Search, Shield, Trash2, Users } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { errorMessage } from '../../api/client'
import { findSports } from '../../api/sports'
import { deleteTeam, disableTeam, enableTeam, findTeams, type Team } from '../../api/teams'
import { RESOURCES, useAccess } from '../../auth/access'
import type { ActionError } from '../../components/ActionAlert'
import { SubjectVisual } from '../../components/ConfirmDialog'
import { SortHeader } from '../../components/SortHeader'
import { SportIcon } from '../../components/SportIcon'
import { TeamMonogram } from '../../components/TeamMonogram'
import { useConfirm } from '../../hooks/useConfirm'
import { useLoadList } from '../../hooks/useLoadList'
import { useSort } from '../../hooks/useSort'
import { useToast } from '../../hooks/useToast'
import { revealIfStacked } from '../../utils/reveal'
import { normalize } from '../roles/labels'
import { kindOfSummary } from '../sports/sportKind'
import { TeamDetail } from './TeamDetail'
import { TeamFormDialog } from './TeamFormDialog'
import '../../components/ListPage.css'
import '../../components/DetailPanel.css'
import '../../components/Vivid.css'

type StatusFilter = '' | 'activos' | 'inactivos'
type SortKey = 'name' | 'city' | 'sports' | 'players' | 'status'

// Qué se compara al ordenar por cada columna (useSort).
const SORT_VALUES: Record<SortKey, (team: Team) => string | number | null> = {
  name: (team) => team.name,
  city: (team) => team.city,
  sports: (team) => team.sports.length,
  players: (team) => team.playersCount,
  status: (team) => (team.active ? 'Activo' : 'Inactivo'),
}

// Balones que caben en la celda "Deportes"; el resto se resume como "+2".
const MAX_ICONS = 3

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

// Pantalla "Equipos" (HU-GD-02): tabla con búsqueda, filtros de deporte y estado, y orden por
// columna; crear, editar, activar/desactivar y eliminar. A la derecha, el detalle con sus datos, sus
// cifras y sus deportes (HU-GD-03).
export function TeamsPage() {
  const { can } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const { showToast, toast } = useToast()
  const canCreate = can(RESOURCES.teams, 'CREATE')
  const canUpdate = can(RESOURCES.teams, 'UPDATE')
  const canDelete = can(RESOURCES.teams, 'DELETE')
  const canListSports = can(RESOURCES.sports, 'LIST')
  const canAssociate = canListSports && can(RESOURCES.teamSports, 'LIST')

  const { items: teams, setItems: setTeams, loading, loadError, reload, retry } = useLoadList(findTeams)
  // Solo para dibujar el balón de cada deporte (un subdeporte usa el de su padre). Si falla o no hay
  // permiso, el balón sale del nombre.
  const { items: sports } = useLoadList(findSports, canListSports)
  const [actionError, setActionError] = useState<ActionError | null>(null)
  const [query, setQuery] = useState('')
  const [sportId, setSportId] = useState<number | null>(null)
  const [status, setStatus] = useState<StatusFilter>('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Team | 'new' | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const detailRef = useRef<HTMLElement>(null)

  // Opciones del filtro de deporte: los que tiene al menos un equipo.
  const sportOptions = useMemo(() => {
    const byId = new Map(teams.flatMap((team) => team.sports).map((sport) => [sport.id, sport]))
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [teams])

  // El backend no filtra: la búsqueda (nombre, nombre corto o ciudad, sin tildes) y los filtros se
  // aplican aquí.
  const filtered = useMemo(() => {
    const text = normalize(query.trim())
    return teams.filter(
      (team) =>
        (status === '' || team.active === (status === 'activos')) &&
        (sportId === null || team.sports.some((sport) => sport.id === sportId)) &&
        (!text ||
          normalize(team.name).includes(text) ||
          normalize(team.shortName ?? '').includes(text) ||
          normalize(team.city).includes(text)),
    )
  }, [teams, query, sportId, status])

  // Sin orden elegido quedan como llegan: por nombre.
  const { sorted: visible, sort, toggleSort } = useSort(filtered, SORT_VALUES)

  // El elegido; si no hay (o quedó fuera de la lista), el primero que se ve.
  const selected = teams.find((team) => team.id === selectedId) ?? visible[0] ?? null

  const activeCount = teams.filter((team) => team.active).length
  const totalPlayers = teams.reduce((sum, team) => sum + team.playersCount, 0)
  const finding = loading
    ? 'Cargando equipos…'
    : loadError
      ? 'No se pudo cargar la lista de equipos.'
      : teams.length === 0
        ? 'Todavía no hay equipos registrados.'
        : `${plural(teams.length, 'equipo registrado', 'equipos registrados')}, ` +
          `${activeCount} ${activeCount === 1 ? 'activo' : 'activos'}. ` +
          `Entre todos suman ${plural(totalPlayers, 'jugador actual', 'jugadores actuales')}.`

  function select(teamId: number, reveal: boolean) {
    if (teamId !== selected?.id) setActionError(null)
    setSelectedId(teamId)
    if (reveal) revealIfStacked(() => detailRef.current)
  }

  function upsert(saved: Team) {
    setTeams((list) =>
      list.some((team) => team.id === saved.id)
        ? list.map((team) => (team.id === saved.id ? saved : team))
        : [...list, saved].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    )
  }

  // Si el backend rechaza la acción, el aviso sale en el detalle: por eso la fila queda elegida.
  async function runAction(team: Team, failTitle: string, action: () => Promise<void>) {
    setSelectedId(team.id)
    setBusyId(team.id)
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

  function subjectOf(team: Team) {
    return <SubjectVisual visual={<TeamMonogram team={team} size="sm" />} name={team.name} detail={team.city} />
  }

  async function toggleActive(team: Team) {
    if (team.active) {
      const confirmed = await confirm({
        title: `¿Desactivar ${team.name}?`,
        message:
          'No se le podrán asociar deportes ni asignar jugadores nuevos. ' +
          'Sus deportes y sus contratos actuales se conservan.',
        confirmLabel: 'Desactivar equipo',
        tone: 'neutral',
        subject: subjectOf(team),
      })
      if (!confirmed) return
    }
    const failTitle = team.active ? 'No se pudo desactivar el equipo' : 'No se pudo activar el equipo'
    await runAction(team, failTitle, async () => {
      const saved = await (team.active ? disableTeam(team.id) : enableTeam(team.id))
      upsert(saved)
      showToast(saved.active ? `${saved.name} quedó activo.` : `${saved.name} quedó desactivado.`)
    })
  }

  async function remove(team: Team) {
    const confirmed = await confirm({
      title: `¿Eliminar ${team.name}?`,
      message:
        'Se borra del sistema. Si tiene deportes asociados o historial de contratos con jugadores ' +
        'no se puede eliminar: en ese caso, desactívalo.',
      confirmLabel: 'Eliminar equipo',
      subject: subjectOf(team),
    })
    if (!confirmed) return
    await runAction(team, 'No se puede eliminar el equipo', async () => {
      await deleteTeam(team.id) // 400 con el motivo si tiene contratos o deportes (HU-GD-02)
      setTeams((list) => list.filter((item) => item.id !== team.id))
      showToast(`Se eliminó ${team.name}.`)
    })
  }

  return (
    <div className="page page--vivid">
      <div className="page__head">
        <div className="page__heading">
          <span className="page__icon" aria-hidden="true">
            <Shield size={22} />
          </span>
          <div>
            <h1 className="page__title">Equipos</h1>
            <p className="page__finding">{finding}</p>
          </div>
        </div>
      </div>

      <div className="panel toolbar">
        <label className="list-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por nombre o ciudad"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
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
        <select aria-label="Filtrar por estado" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
          <option value="">Todos los estados</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </select>
        {canCreate && (
          <button type="button" className="button button--primary toolbar__action" onClick={() => setEditing('new')}>
            <Plus size={18} aria-hidden="true" />
            Nuevo equipo
          </button>
        )}
      </div>

      <div className="page__grid">
        <section className="panel" aria-labelledby="teams-list-title" aria-busy={loading}>
          <div className="panel-head">
            <span className="panel-head__icon" aria-hidden="true">
              <List size={16} />
            </span>
            <h2 id="teams-list-title" className="panel__title">
              Lista de equipos
            </h2>
            {!loading && !loadError && <span className="count-chip">{plural(teams.length, 'equipo', 'equipos')}</span>}
          </div>

          {loadError ? (
            <div className="inline-error" role="alert">
              <CircleAlert size={16} aria-hidden="true" />
              <span>{loadError}</span>
              <button type="button" className="text-action" onClick={retry}>
                Reintentar
              </button>
            </div>
          ) : loading ? (
            <p className="empty-state">Cargando equipos…</p>
          ) : visible.length === 0 ? (
            <p className="empty-state">
              {teams.length === 0
                ? canCreate
                  ? 'No hay equipos registrados. Crea el primero con "Nuevo equipo".'
                  : 'No hay equipos registrados.'
                : 'Ningún equipo coincide con los filtros.'}
            </p>
          ) : (
            <>
              <div className="table-scroll">
                <table className="data-table data-table--select data-table--rows">
                  <thead>
                    <tr>
                      <SortHeader label="Equipo" sortKey="name" sort={sort} onSort={toggleSort} />
                      <SortHeader
                        label="Ciudad"
                        sortKey="city"
                        sort={sort}
                        onSort={toggleSort}
                        className="data-table__optional"
                      />
                      <SortHeader
                        label="Deportes"
                        sortKey="sports"
                        sort={sort}
                        onSort={toggleSort}
                        className="data-table__optional"
                      />
                      <SortHeader
                        label="Jugadores"
                        sortKey="players"
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
                    {visible.map((team) => {
                      const busy = busyId === team.id
                      const isSelected = team.id === selected?.id
                      return (
                        <tr
                          key={team.id}
                          className={`${isSelected ? 'is-selected' : ''}${team.active ? '' : ' is-inactive'}`}
                          aria-current={isSelected ? 'true' : undefined}
                          onClick={() => select(team.id, false)}
                        >
                          <td className="data-table__name">
                            <span className="role-cell">
                              <TeamMonogram team={team} size="md" />
                              <span className="cell-lines">
                                <span className="data-table__strong">{team.name}</span>
                                {team.shortName && <span className="cell-lines__detail">{team.shortName}</span>}
                              </span>
                            </span>
                          </td>
                          <td className="data-table__optional">
                            <span className="icon-text">
                              <MapPin size={14} aria-hidden="true" />
                              {team.city}
                            </span>
                          </td>
                          <td className="data-table__optional">
                            {team.sports.length === 0 ? (
                              <span className="dash">Ninguno</span>
                            ) : (
                              <span className="sport-stack" title={team.sports.map((sport) => sport.name).join(', ')}>
                                {team.sports.slice(0, MAX_ICONS).map((sport) => (
                                  <SportIcon key={sport.id} kind={kindOfSummary(sport, sports)} id={sport.id} size={20} />
                                ))}
                                {team.sports.length > MAX_ICONS && (
                                  <span className="sport-stack__more">+{team.sports.length - MAX_ICONS}</span>
                                )}
                                <span className="sr-only">{team.sports.map((sport) => sport.name).join(', ')}</span>
                              </span>
                            )}
                          </td>
                          <td className="data-table__optional">
                            <span className="icon-text icon-text--figure">
                              <Users size={16} aria-hidden="true" />
                              {team.playersCount}
                            </span>
                          </td>
                          <td className="data-table__optional">
                            <span className={`pill ${team.active ? 'pill--positive' : 'pill--neutral'}`}>
                              <span className="status-dot" aria-hidden="true" />
                              {team.active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          {/* Los botones no eligen la fila por su cuenta: cada uno hace lo suyo. */}
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="row-actions">
                              <button
                                type="button"
                                className="act act--blue"
                                title="Ver"
                                aria-label={`Ver ${team.name}`}
                                onClick={() => select(team.id, true)}
                              >
                                <Eye size={16} aria-hidden="true" />
                              </button>
                              {canUpdate && (
                                <button
                                  type="button"
                                  className="act act--blue"
                                  title="Editar"
                                  aria-label={`Editar ${team.name}`}
                                  disabled={busy}
                                  onClick={() => setEditing(team)}
                                >
                                  <Pencil size={16} aria-hidden="true" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  className="act act--red"
                                  title="Eliminar"
                                  aria-label={`Eliminar ${team.name}`}
                                  disabled={busy}
                                  onClick={() => remove(team)}
                                >
                                  <Trash2 size={16} aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="list-foot">
                Mostrando {visible.length} de {plural(teams.length, 'equipo', 'equipos')}
              </p>
            </>
          )}
        </section>

        <TeamDetail
          ref={detailRef}
          team={loading || loadError ? null : selected}
          sports={sports}
          emptyMessage={
            loading
              ? 'Cargando equipos…'
              : loadError
                ? 'Cuando la lista cargue, aquí verás el detalle del equipo elegido.'
                : teams.length === 0
                  ? 'Cuando registres un equipo, aquí verás sus datos, sus cifras y sus deportes.'
                  : 'Ningún equipo coincide con los filtros.'
          }
          busy={selected !== null && busyId === selected.id}
          error={actionError}
          onDismissError={() => setActionError(null)}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canAssociate={canAssociate}
          onEdit={setEditing}
          onToggleActive={toggleActive}
          onDelete={remove}
        />
      </div>

      {editing && (
        <TeamFormDialog
          team={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved, isNew) => {
            setEditing(null)
            upsert(saved)
            setSelectedId(saved.id)
            setActionError(null)
            showToast(isNew ? `${saved.name} quedó registrado.` : 'Cambios guardados.')
            reload()
          }}
        />
      )}
      {confirmDialog}
      {toast}
    </div>
  )
}
