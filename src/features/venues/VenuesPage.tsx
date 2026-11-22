import { Armchair, Building2, Eye, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { errorMessage } from '../../api/client'
import { deleteVenue, disableVenue, enableVenue, findVenues, type Venue } from '../../api/venues'
import { canOpenPage, RESOURCES, useAccess } from '../../auth/access'
import type { ActionError } from '../../components/ActionAlert'
import { SubjectVisual } from '../../components/ConfirmDialog'
import { ListPanel, ListToolbar, RowAction, RowActions, StatusPill, ToolbarButton } from '../../components/ListView'
import { PageHeading } from '../../components/PageHeading'
import { SortHeader } from '../../components/SortHeader'
import { VenuePhoto } from '../../components/VenuePhoto'
import { useConfirm } from '../../hooks/useConfirm'
import { useLoadList } from '../../hooks/useLoadList'
import { useSort } from '../../hooks/useSort'
import { useToast } from '../../hooks/useToast'
import { plural } from '../../utils/plural'
import { revealIfStacked } from '../../utils/reveal'
import { normalize } from '../roles/labels'
import { VenueDetail } from './VenueDetail'
import { VenueFormDialog } from './VenueFormDialog'
import { placeOf, seats, statusOf, treeOrder } from './venueInfo'
import './Venues.css'

type StatusFilter = '' | 'disponibles' | 'no-disponibles'
type SortKey = 'name' | 'city' | 'localities' | 'capacity' | 'status'

// Qué se compara al ordenar por cada columna (useSort).
const SORT_VALUES: Record<SortKey, (venue: Venue) => string | number | null> = {
  name: (venue) => venue.name,
  city: (venue) => venue.city,
  localities: (venue) => venue.localities.filter((locality) => locality.active).length,
  capacity: (venue) => venue.capacity,
  status: (venue) => statusOf(venue).label,
}

// El formulario abierto: crear, crear adentro de uno principal o editar.
type Editing = { venue: Venue | null; parentId: number | null }

// Pantalla "Escenarios" (HU-GE-01 y 03): tabla con búsqueda, filtros de ciudad y estado, y orden por
// columna; crear (también adentro de otro), editar, activar/desactivar y eliminar. A la derecha, el
// detalle con su foto, su capacidad, sus localidades, los escenarios de adentro y sus torneos.
interface VenuesPageProps {
  initialVenueId: number | null // escenario pedido en la URL (#escenarios/4); null: el primero de la lista
}

export function VenuesPage({ initialVenueId }: VenuesPageProps) {
  const { can } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const { showToast, toast } = useToast()
  const canCreate = can(RESOURCES.venues, 'CREATE')
  const canUpdate = can(RESOURCES.venues, 'UPDATE')
  const canDelete = can(RESOURCES.venues, 'DELETE')
  const localityAbilities = {
    list: can(RESOURCES.localities, 'LIST'),
    create: can(RESOURCES.localities, 'CREATE'),
    update: can(RESOURCES.localities, 'UPDATE'),
    remove: can(RESOURCES.localities, 'DELETE'),
  }
  const canSeeTournaments = can(RESOURCES.tournamentVenues, 'LIST')

  const { items: venues, setItems: setVenues, loading, loadError, reload, retry } = useLoadList(findVenues)
  const [actionError, setActionError] = useState<ActionError | null>(null)
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [selectedId, setSelectedId] = useState<number | null>(initialVenueId)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const detailRef = useRef<HTMLElement>(null)

  const cityOptions = useMemo(
    () => [...new Set(venues.map((venue) => venue.city))].sort((a, b) => a.localeCompare(b, 'es')),
    [venues],
  )

  // El backend no filtra: la búsqueda (nombre, el del principal, dirección o ciudad, sin tildes) y los
  // filtros se aplican aquí. Sin orden elegido, cada principal va seguido de los de adentro.
  const filtered = useMemo(() => {
    const text = normalize(query.trim())
    return treeOrder(
      venues.filter(
        (venue) =>
          (city === '' || venue.city === city) &&
          (status === '' || venue.available === (status === 'disponibles')) &&
          (!text ||
            normalize(venue.name).includes(text) ||
            normalize(venue.parent?.name ?? '').includes(text) ||
            normalize(venue.address).includes(text) ||
            normalize(venue.city).includes(text)),
      ),
    )
  }, [venues, query, city, status])

  const { sorted: visible, sort, toggleSort } = useSort(filtered, SORT_VALUES)

  // El elegido; si no hay (o quedó fuera de la lista), el primero que se ve.
  const selected = venues.find((venue) => venue.id === selectedId) ?? visible[0] ?? null

  const availableCount = venues.filter((venue) => venue.available).length
  const totalSeats = venues.reduce((sum, venue) => sum + venue.capacity, 0)
  const finding = loading
    ? 'Cargando escenarios…'
    : loadError
      ? 'No se pudo cargar la lista de escenarios.'
      : venues.length === 0
        ? 'Todavía no hay escenarios registrados.'
        : `${plural(venues.length, 'escenario registrado', 'escenarios registrados')}, ` +
          `${availableCount} ${availableCount === 1 ? 'disponible' : 'disponibles'}. ` +
          `Entre todos suman ${seats(totalSeats)}.`

  function select(venueId: number, reveal: boolean) {
    if (venueId !== selected?.id) setActionError(null)
    setSelectedId(venueId)
    if (reveal) revealIfStacked(() => detailRef.current)
  }

  // Cambiar uno cambia también a los que lo nombran (su principal y los de adentro): se recarga todo.
  function replace(saved: Venue) {
    setVenues((list) => list.map((venue) => (venue.id === saved.id ? saved : venue)))
    reload()
  }

  // Si el backend rechaza la acción, el aviso sale en el detalle: por eso la fila queda elegida.
  async function runAction(venue: Venue, failTitle: string, action: () => Promise<void>) {
    setSelectedId(venue.id)
    setBusyId(venue.id)
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

  function subjectOf(venue: Venue) {
    return <SubjectVisual visual={<VenuePhoto venue={venue} size="sm" />} name={venue.name} detail={placeOf(venue)} />
  }

  async function toggleActive(venue: Venue) {
    if (venue.active) {
      const inside = venue.children.length
      const confirmed = await confirm({
        title: `¿Desactivar ${venue.name}?`,
        message:
          'No se podrá asignar a torneos, programar partidos en él ni agregarle localidades. ' +
          (inside > 0
            ? `Los ${plural(inside, 'escenario', 'escenarios')} de adentro tampoco se podrán usar mientras tanto. `
            : '') +
          'Sus localidades, sus torneos y sus partidos actuales se conservan.',
        confirmLabel: 'Desactivar escenario',
        tone: 'neutral',
        subject: subjectOf(venue),
      })
      if (!confirmed) return
    }
    const failTitle = venue.active ? 'No se pudo desactivar el escenario' : 'No se pudo activar el escenario'
    await runAction(venue, failTitle, async () => {
      const saved = await (venue.active ? disableVenue(venue.id) : enableVenue(venue.id))
      replace(saved)
      showToast(saved.active ? `${saved.name} quedó activo.` : `${saved.name} quedó desactivado.`)
    })
  }

  async function remove(venue: Venue) {
    const confirmed = await confirm({
      title: `¿Eliminar ${venue.name}?`,
      message:
        'Se borra del sistema. Si tiene escenarios adentro, localidades, torneos o partidos no se puede ' +
        'eliminar: en ese caso, desactívalo.',
      confirmLabel: 'Eliminar escenario',
      subject: subjectOf(venue),
    })
    if (!confirmed) return
    await runAction(venue, 'No se puede eliminar el escenario', async () => {
      await deleteVenue(venue.id) // 400 con el motivo (HU-GE-01)
      setVenues((list) => list.filter((item) => item.id !== venue.id))
      showToast(`Se eliminó ${venue.name}.`)
      reload()
    })
  }

  return (
    <div className="page page--vivid">
      <PageHeading icon={Building2} title="Escenarios" finding={finding} />

      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Buscar por nombre, dirección o ciudad"
        actions={
          canCreate && (
            <ToolbarButton
              primary
              icon={Plus}
              label="Nuevo escenario"
              onClick={() => setEditing({ venue: null, parentId: null })}
            />
          )
        }
      >
        <select aria-label="Filtrar por ciudad" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">Todas las ciudades</option>
          {cityOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por estado"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
        >
          <option value="">Todos los estados</option>
          <option value="disponibles">Disponibles</option>
          <option value="no-disponibles">No disponibles</option>
        </select>
      </ListToolbar>

      <div className="page__grid">
        <ListPanel
          title="Lista de escenarios"
          titleId="venues-list-title"
          noun={['escenario', 'escenarios']}
          total={venues.length}
          shown={visible.length}
          loading={loading}
          loadError={loadError}
          onRetry={retry}
          emptyMessage={
            visible.length > 0
              ? null
              : venues.length === 0
                ? canCreate
                  ? 'No hay escenarios registrados. Crea el primero con "Nuevo escenario".'
                  : 'No hay escenarios registrados.'
                : 'Ningún escenario coincide con los filtros.'
          }
        >
          <div className="table-scroll">
            <table className="data-table data-table--select data-table--rows">
              <thead>
                <tr>
                  <SortHeader label="Escenario" sortKey="name" sort={sort} onSort={toggleSort} />
                  <SortHeader
                    label="Ciudad"
                    sortKey="city"
                    sort={sort}
                    onSort={toggleSort}
                    className="data-table__optional"
                  />
                  <SortHeader
                    label="Localidades"
                    sortKey="localities"
                    sort={sort}
                    onSort={toggleSort}
                    className="data-table__optional venue-col--localities"
                  />
                  <SortHeader
                    label="Capacidad"
                    sortKey="capacity"
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
                {visible.map((venue) => {
                  const busy = busyId === venue.id
                  const isSelected = venue.id === selected?.id
                  const venueStatus = statusOf(venue)
                  const activeLocalities = venue.localities.filter((locality) => locality.active).length
                  return (
                    <tr
                      key={venue.id}
                      className={`${isSelected ? 'is-selected' : ''}${venue.active ? '' : ' is-inactive'}`}
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={() => select(venue.id, false)}
                    >
                      <td className="data-table__name">
                        <span className="role-cell">
                          <VenuePhoto venue={venue} size="md" />
                          <span className="cell-lines">
                            <span className="data-table__strong">{venue.name}</span>
                            <span className="cell-lines__detail">
                              {venue.parent ? `Dentro de ${venue.parent.name}` : venue.address}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="data-table__optional">
                        <span className="icon-text venue-city">
                          <MapPin size={14} aria-hidden="true" />
                          {venue.city}
                        </span>
                      </td>
                      <td className="data-table__optional venue-col--localities">
                        {venue.localities.length === 0 ? (
                          <span className="dash">Ninguna</span>
                        ) : (
                          <span className="icon-text icon-text--figure">
                            <Armchair size={16} aria-hidden="true" />
                            {activeLocalities}
                          </span>
                        )}
                      </td>
                      <td className="data-table__optional">
                        {venue.capacity === 0 ? (
                          <span className="dash">—</span>
                        ) : (
                          <span className="venue-seats" title={seats(venue.capacity)}>
                            {venue.capacity.toLocaleString('es-CO')}
                          </span>
                        )}
                      </td>
                      <td className="data-table__optional">
                        <StatusPill
                          active={venueStatus.available}
                          inactiveLabel={venueStatus.label}
                        />
                      </td>
                      <RowActions>
                        <RowAction
                          icon={Eye}
                          title="Ver"
                          label={`Ver ${venue.name}`}
                          onClick={() => select(venue.id, true)}
                        />
                        {canUpdate && (
                          <RowAction
                            icon={Pencil}
                            title="Editar"
                            label={`Editar ${venue.name}`}
                            disabled={busy}
                            onClick={() => setEditing({ venue, parentId: venue.parent?.id ?? null })}
                          />
                        )}
                        {canDelete && (
                          <RowAction
                            icon={Trash2}
                            tone="red"
                            title="Eliminar"
                            label={`Eliminar ${venue.name}`}
                            disabled={busy}
                            onClick={() => remove(venue)}
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

        <VenueDetail
          ref={detailRef}
          venue={loading || loadError ? null : selected}
          emptyMessage={
            loading
              ? 'Cargando escenarios…'
              : loadError
                ? 'Cuando la lista cargue, aquí verás el detalle del escenario elegido.'
                : venues.length === 0
                  ? 'Cuando registres un escenario, aquí verás su foto, su capacidad y sus localidades.'
                  : 'Ningún escenario coincide con los filtros.'
          }
          busy={selected !== null && busyId === selected.id}
          error={actionError}
          onDismissError={() => setActionError(null)}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
          localities={localityAbilities}
          canSeeTournaments={canSeeTournaments}
          canOpenTournaments={canOpenPage('torneos', can)}
          onEdit={(venue) => setEditing({ venue, parentId: venue.parent?.id ?? null })}
          onAddInside={(venue) => setEditing({ venue: null, parentId: venue.id })}
          onToggleActive={toggleActive}
          onDelete={remove}
          onLocalitiesChanged={reload}
          onToast={showToast}
        />
      </div>

      {editing && (
        <VenueFormDialog
          venue={editing.venue}
          venues={venues}
          initialParentId={editing.parentId}
          onClose={() => setEditing(null)}
          onSaved={(saved, isNew) => {
            setEditing(null)
            setVenues((list) =>
              list.some((venue) => venue.id === saved.id)
                ? list.map((venue) => (venue.id === saved.id ? saved : venue))
                : [...list, saved],
            )
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
