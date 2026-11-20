import { Eye, Pencil, Plus, Trash2, Trophy, Users } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { errorMessage } from '../../api/client'
import { findSports } from '../../api/sports'
import {
  deleteTournament,
  disableTournament,
  enableTournament,
  findTournaments,
  type Tournament,
  type TournamentCategory,
  type TournamentStatus,
} from '../../api/tournaments'
import { canOpenPage, RESOURCES, useAccess } from '../../auth/access'
import type { ActionError } from '../../components/ActionAlert'
import { SubjectVisual } from '../../components/ConfirmDialog'
import { ListPanel, ListToolbar, RowAction, RowActions, ToolbarButton } from '../../components/ListView'
import { PageHeading } from '../../components/PageHeading'
import { SortHeader } from '../../components/SortHeader'
import { SportIcon } from '../../components/SportIcon'
import { TournamentBadge } from '../../components/TournamentBadge'
import { useConfirm } from '../../hooks/useConfirm'
import { useLoadList } from '../../hooks/useLoadList'
import { useSort } from '../../hooks/useSort'
import { useToast } from '../../hooks/useToast'
import { formatDateShort } from '../../utils/dates'
import { plural } from '../../utils/plural'
import { revealIfStacked } from '../../utils/reveal'
import { normalize } from '../roles/labels'
import { kindOfSummary } from '../sports/sportKind'
import { CATEGORIES, categoryLabel } from './tournamentInfo'
import { TournamentDetail } from './TournamentDetail'
import { TournamentFormDialog } from './TournamentFormDialog'
import { TournamentStatusTag } from './TournamentStatusTag'
import './Tournaments.css'

// "inactivos" es aparte: en la tabla un torneo desactivado se ve como "Inactivo", no por su estado.
type StatusFilter = '' | TournamentStatus | 'inactivos'
type SortKey = 'name' | 'sport' | 'start' | 'teams' | 'status'

const STATUS_ORDER: TournamentStatus[] = ['EN_CURSO', 'POR_INICIAR', 'FINALIZADO']

// Qué se compara al ordenar por cada columna (useSort). Las fechas "AAAA-MM-DD" ordenan bien como texto.
const SORT_VALUES: Record<SortKey, (tournament: Tournament) => string | number | null> = {
  name: (tournament) => tournament.name,
  sport: (tournament) => tournament.sport.name,
  start: (tournament) => tournament.startDate,
  teams: (tournament) => tournament.teamsCount,
  // En curso, por iniciar, finalizados y, al final, los desactivados.
  status: (tournament) => (tournament.active ? STATUS_ORDER.indexOf(tournament.status) : STATUS_ORDER.length),
}

// Pantalla "Torneos" (HU-GC-01): tabla con búsqueda, filtros de deporte, categoría y estado, y orden por
// columna; crear, editar, activar/desactivar y eliminar. A la derecha, el detalle con sus fechas, sus
// inscripciones y sus equipos (HU-GC-02).
interface TournamentsPageProps {
  initialTournamentId: number | null // torneo pedido en la URL (#torneos/5); null: el primero de la lista
}

export function TournamentsPage({ initialTournamentId }: TournamentsPageProps) {
  const { can } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const { showToast, toast } = useToast()
  const canListSports = can(RESOURCES.sports, 'LIST')
  // Para crear hay que elegir un deporte de la lista.
  const canCreate = can(RESOURCES.tournaments, 'CREATE') && canListSports
  const canUpdate = can(RESOURCES.tournaments, 'UPDATE')
  const canDelete = can(RESOURCES.tournaments, 'DELETE')
  const canSeeDevelopment = canOpenPage('torneos-desarrollo', can)

  const {
    items: tournaments,
    setItems: setTournaments,
    loading,
    loadError,
    reload,
    retry,
  } = useLoadList(findTournaments)
  // Para el balón de cada deporte y para elegirlo en el formulario. Sin permiso, el balón sale del nombre.
  const { items: sports } = useLoadList(findSports, canListSports)
  const [actionError, setActionError] = useState<ActionError | null>(null)
  const [query, setQuery] = useState('')
  const [sportId, setSportId] = useState<number | null>(null)
  const [category, setCategory] = useState<TournamentCategory | ''>('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [selectedId, setSelectedId] = useState<number | null>(initialTournamentId)
  const [editing, setEditing] = useState<Tournament | 'new' | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const detailRef = useRef<HTMLElement>(null)

  // Opciones del filtro de deporte: los que tienen al menos un torneo.
  const sportOptions = useMemo(() => {
    const byId = new Map(tournaments.map((tournament) => [tournament.sport.id, tournament.sport]))
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [tournaments])

  // El backend no filtra: la búsqueda (por nombre, sin tildes) y los filtros se aplican aquí.
  const filtered = useMemo(() => {
    const text = normalize(query.trim())
    return tournaments.filter(
      (tournament) =>
        (status === ''
          ? true
          : status === 'inactivos'
            ? !tournament.active
            : tournament.active && tournament.status === status) &&
        (sportId === null || tournament.sport.id === sportId) &&
        (category === '' || tournament.category === category) &&
        (!text || normalize(tournament.name).includes(text)),
    )
  }, [tournaments, query, sportId, category, status])

  // Sin orden elegido quedan como llegan: los más recientes primero.
  const { sorted: visible, sort, toggleSort } = useSort(filtered, SORT_VALUES)

  // El elegido; si no hay (o quedó fuera de la lista), el primero que se ve.
  const selected = tournaments.find((tournament) => tournament.id === selectedId) ?? visible[0] ?? null

  const finding = loading
    ? 'Cargando torneos…'
    : loadError
      ? 'No se pudo cargar la lista de torneos.'
      : tournaments.length === 0
        ? 'Todavía no hay torneos registrados.'
        : summarize(tournaments)

  function select(tournamentId: number, reveal: boolean) {
    if (tournamentId !== selected?.id) setActionError(null)
    setSelectedId(tournamentId)
    if (reveal) revealIfStacked(() => detailRef.current)
  }

  // Lo nuevo entra en su lugar: por fecha de inicio, del más reciente al más antiguo (como el backend).
  function upsert(saved: Tournament) {
    setTournaments((list) =>
      [...list.filter((tournament) => tournament.id !== saved.id), saved].sort(
        (a, b) => b.startDate.localeCompare(a.startDate) || a.name.localeCompare(b.name, 'es'),
      ),
    )
  }

  // Si el backend rechaza la acción, el aviso sale en el detalle: por eso la fila queda elegida.
  async function runAction(tournament: Tournament, failTitle: string, action: () => Promise<void>) {
    setSelectedId(tournament.id)
    setBusyId(tournament.id)
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

  function subjectOf(tournament: Tournament) {
    return (
      <SubjectVisual
        visual={<TournamentBadge tournament={tournament} size="sm" />}
        name={tournament.name}
        detail={`${tournament.sport.name} · ${categoryLabel(tournament.category)}`}
      />
    )
  }

  async function toggleActive(tournament: Tournament) {
    if (tournament.active) {
      const confirmed = await confirm({
        title: `¿Desactivar ${tournament.name}?`,
        message:
          'No se podrán inscribir ni retirar equipos, ni agregarle fases, grupos o partidos. ' +
          'Lo que ya tiene se conserva.',
        confirmLabel: 'Desactivar torneo',
        tone: 'neutral',
        subject: subjectOf(tournament),
      })
      if (!confirmed) return
    }
    const failTitle = tournament.active ? 'No se pudo desactivar el torneo' : 'No se pudo activar el torneo'
    await runAction(tournament, failTitle, async () => {
      const saved = await (tournament.active ? disableTournament(tournament.id) : enableTournament(tournament.id))
      upsert(saved)
      showToast(saved.active ? `${saved.name} quedó activo.` : `${saved.name} quedó desactivado.`)
    })
  }

  async function remove(tournament: Tournament) {
    const confirmed = await confirm({
      title: `¿Eliminar ${tournament.name}?`,
      message:
        'Se borra del sistema. Si tiene fases o equipos inscritos no se puede eliminar: en ese caso, desactívalo.',
      confirmLabel: 'Eliminar torneo',
      subject: subjectOf(tournament),
    })
    if (!confirmed) return
    await runAction(tournament, 'No se puede eliminar el torneo', async () => {
      await deleteTournament(tournament.id) // 400 con el motivo si tiene fases o inscripciones (HU-GC-01)
      setTournaments((list) => list.filter((item) => item.id !== tournament.id))
      showToast(`Se eliminó ${tournament.name}.`)
    })
  }

  return (
    <div className="page page--vivid">
      <PageHeading icon={Trophy} title="Torneos" finding={finding} />

      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Buscar por nombre"
        actions={
          canCreate && <ToolbarButton primary icon={Plus} label="Nuevo torneo" onClick={() => setEditing('new')} />
        }
      >
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
        <select
          aria-label="Filtrar por categoría"
          value={category}
          onChange={(e) => setCategory(e.target.value as TournamentCategory | '')}
        >
          <option value="">Todas las categorías</option>
          {CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por estado"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
        >
          <option value="">Todos los estados</option>
          <option value="EN_CURSO">En curso</option>
          <option value="POR_INICIAR">Por iniciar</option>
          <option value="FINALIZADO">Finalizados</option>
          <option value="inactivos">Inactivos</option>
        </select>
      </ListToolbar>

      <div className="page__grid">
        <ListPanel
          title="Lista de torneos"
          titleId="tournaments-list-title"
          noun={['torneo', 'torneos']}
          total={tournaments.length}
          shown={visible.length}
          loading={loading}
          loadError={loadError}
          onRetry={retry}
          emptyMessage={
            visible.length > 0
              ? null
              : tournaments.length === 0
                ? canCreate
                  ? 'No hay torneos registrados. Crea el primero con "Nuevo torneo".'
                  : 'No hay torneos registrados.'
                : 'Ningún torneo coincide con los filtros.'
          }
        >
          <div className="table-scroll">
            <table className="data-table data-table--select data-table--rows">
              <thead>
                <tr>
                  <SortHeader label="Torneo" sortKey="name" sort={sort} onSort={toggleSort} />
                  <SortHeader
                    label="Deporte"
                    sortKey="sport"
                    sort={sort}
                    onSort={toggleSort}
                    className="data-table__optional"
                  />
                  <SortHeader
                    label="Fechas"
                    sortKey="start"
                    sort={sort}
                    onSort={toggleSort}
                    className="data-table__optional"
                  />
                  <SortHeader
                    label="Equipos"
                    sortKey="teams"
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
                {visible.map((tournament) => {
                  const busy = busyId === tournament.id
                  const isSelected = tournament.id === selected?.id
                  return (
                    <tr
                      key={tournament.id}
                      className={`${isSelected ? 'is-selected' : ''}${tournament.active ? '' : ' is-inactive'}`}
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={() => select(tournament.id, false)}
                    >
                      <td className="data-table__name">
                        <span className="role-cell">
                          <TournamentBadge tournament={tournament} />
                          <span className="cell-lines">
                            <span className="data-table__strong">{tournament.name}</span>
                            <span className="cell-lines__detail">{categoryLabel(tournament.category)}</span>
                          </span>
                        </span>
                      </td>
                      <td className="data-table__optional">
                        <span className="icon-text">
                          <SportIcon kind={kindOfSummary(tournament.sport, sports)} id={tournament.sport.id} size={20} />
                          {tournament.sport.name}
                        </span>
                      </td>
                      <td className="data-table__optional">
                        <span className="cell-lines num">
                          <span>{formatDateShort(tournament.startDate)}</span>
                          <span className="cell-lines__detail">al {formatDateShort(tournament.endDate)}</span>
                        </span>
                      </td>
                      <td className="data-table__optional">
                        <span className="icon-text icon-text--figure">
                          <Users size={16} aria-hidden="true" />
                          {tournament.teamsCount}
                        </span>
                      </td>
                      {/* En el celular se oculta, como en Equipos: el estado se ve en el detalle. */}
                      <td className="data-table__optional">
                        <TournamentStatusTag tournament={tournament} />
                      </td>
                      <RowActions>
                        {/* Ver abre su desarrollo (HU-GC-08): sin ese permiso, el botón no aparece. */}
                        {canSeeDevelopment && (
                          <RowAction
                            icon={Eye}
                            title="Ver desarrollo"
                            label={`Ver el desarrollo de ${tournament.name}`}
                            href={`#torneos-desarrollo/${tournament.id}`}
                          />
                        )}
                        {canUpdate && (
                          <RowAction
                            icon={Pencil}
                            title="Editar"
                            label={`Editar ${tournament.name}`}
                            disabled={busy}
                            onClick={() => setEditing(tournament)}
                          />
                        )}
                        {canDelete && (
                          <RowAction
                            icon={Trash2}
                            tone="red"
                            title="Eliminar"
                            label={`Eliminar ${tournament.name}`}
                            disabled={busy}
                            onClick={() => remove(tournament)}
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

        <TournamentDetail
          ref={detailRef}
          tournament={loading || loadError ? null : selected}
          sports={sports}
          emptyMessage={
            loading
              ? 'Cargando torneos…'
              : loadError
                ? 'Cuando la lista cargue, aquí verás el detalle del torneo elegido.'
                : tournaments.length === 0
                  ? 'Cuando registres un torneo, aquí verás sus fechas, sus inscripciones y sus equipos.'
                  : 'Ningún torneo coincide con los filtros.'
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
        <TournamentFormDialog
          tournament={editing === 'new' ? null : editing}
          sports={sports}
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

// La frase del encabezado: cuántos hay en cada estado y cuántos reciben inscripciones hoy.
// Ej: "5 torneos registrados: 2 en curso, 1 por iniciar y 2 finalizados. 1 tiene inscripciones abiertas."
function summarize(tournaments: Tournament[]): string {
  const count = (value: TournamentStatus) =>
    tournaments.filter((tournament) => tournament.active && tournament.status === value).length
  const inactive = tournaments.filter((tournament) => !tournament.active).length
  const parts = [
    `${count('EN_CURSO')} en curso`,
    `${count('POR_INICIAR')} por iniciar`,
    plural(count('FINALIZADO'), 'finalizado', 'finalizados'),
    ...(inactive > 0 ? [plural(inactive, 'inactivo', 'inactivos')] : []),
  ]
  const states = `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`
  const open = tournaments.filter((tournament) => tournament.registrationOpen).length
  return (
    `${plural(tournaments.length, 'torneo registrado', 'torneos registrados')}: ${states}. ` +
    (open === 0 ? 'Ninguno tiene inscripciones abiertas.' : `${plural(open, 'tiene', 'tienen')} inscripciones abiertas.`)
  )
}
