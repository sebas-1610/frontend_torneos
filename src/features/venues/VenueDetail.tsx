import { Armchair, Building2, CornerDownRight, Info, MapPin, Plus, Users } from 'lucide-react'
import type { Ref } from 'react'
import type { Venue } from '../../api/venues'
import type { ActionError } from '../../components/ActionAlert'
import {
  DetailActions,
  DetailHero,
  DetailMain,
  DetailPanel,
  DetailSection,
  DetailSide,
  StatTile,
  StatTiles,
} from '../../components/DetailPanel'
import { VenuePhoto } from '../../components/VenuePhoto'
import { hueFor } from '../../utils/hue'
import { VenueLocalities, type LocalityAbilities } from './VenueLocalities'
import { VenueTournaments } from './VenueTournaments'
import { placeOf, statusOf } from './venueInfo'

interface VenueDetailProps {
  ref?: Ref<HTMLElement>
  venue: Venue | null // null: no hay escenarios que mostrar
  emptyMessage: string
  busy: boolean
  error: ActionError | null // la última acción rechazada (ej: no se puede eliminar porque tiene localidades)
  onDismissError: () => void
  canCreate: boolean // agregar un escenario adentro
  canUpdate: boolean
  canDelete: boolean
  localities: LocalityAbilities
  canSeeTournaments: boolean // puede consultar los torneos del escenario (HU-GE-02)
  canOpenTournaments: boolean // y abrir cada uno en Torneos
  onEdit: (venue: Venue) => void
  onAddInside: (venue: Venue) => void
  onToggleActive: (venue: Venue) => void
  onDelete: (venue: Venue) => void
  onLocalitiesChanged: () => void
  onToast: (message: string) => void
}

// Panel derecho de Escenarios: el elegido con su foto, dónde queda, su capacidad, sus localidades
// (HU-GE-03), los escenarios que tiene adentro y los torneos a los que está asignado (HU-GE-02).
export function VenueDetail({
  ref,
  venue,
  emptyMessage,
  busy,
  error,
  onDismissError,
  canCreate,
  canUpdate,
  canDelete,
  localities,
  canSeeTournaments,
  canOpenTournaments,
  onEdit,
  onAddInside,
  onToggleActive,
  onDelete,
  onLocalitiesChanged,
  onToast,
}: VenueDetailProps) {
  if (!venue) {
    return <DetailPanel ref={ref} label="Detalle del escenario" icon={Info} emptyMessage={emptyMessage} />
  }

  const status = statusOf(venue)
  const activeLocalities = venue.localities.filter((locality) => locality.active).length
  const isMain = venue.parent === null
  return (
    <DetailPanel
      ref={ref}
      label="Detalle del escenario"
      icon={Info}
      titleId="venue-detail-title"
      emptyMessage={null}
      error={error}
      onDismissError={onDismissError}
    >
      <DetailMain>
        <DetailHero glow={`hsl(${hueFor(venue.id)} 65% 48%)`} visual={<VenuePhoto venue={venue} size={venue.photo ? 'cover' : 'lg'} />}>
          <h3 id="venue-detail-title" className="hero__name">
            {venue.name}
          </h3>
          <span className={`pill ${status.available ? 'pill--positive' : 'pill--neutral'}`}>
            <span className="status-dot" aria-hidden="true" />
            {status.label}
          </span>
          <ul className="hero__facts">
            <li>
              <MapPin size={14} aria-hidden="true" />
              <span>
                <strong>{placeOf(venue)}</strong>
              </span>
            </li>
            {venue.parent && (
              <li>
                <CornerDownRight size={14} aria-hidden="true" />
                <span>
                  Dentro de:{' '}
                  <a className="text-action" href={`#escenarios/${venue.parent.id}`}>
                    {venue.parent.name}
                  </a>
                </span>
              </li>
            )}
          </ul>
        </DetailHero>

        <StatTiles>
          <StatTile icon={Users} tone="--tone-amber" value={venue.capacity} label="Puestos en total" />
          <StatTile
            icon={Armchair}
            tone="--tone-blue"
            value={activeLocalities}
            label={activeLocalities === 1 ? 'Localidad activa' : 'Localidades activas'}
          />
        </StatTiles>

        {/* La key vuelve a pedir las localidades al cambiar de escenario. */}
        <VenueLocalities
          key={venue.id}
          venue={venue}
          abilities={localities}
          onChanged={onLocalitiesChanged}
          onToast={onToast}
        />
        {!venue.available && venue.active && venue.parent && (
          <p className="detail__empty detail__note">
            No se puede usar mientras "{venue.parent.name}" esté desactivado.
          </p>
        )}
      </DetailMain>

      <DetailSide>
        <DetailSection title="Descripción">
          <p className="detail-section__text">{venue.description ?? 'Sin descripción.'}</p>
        </DetailSection>

        {isMain && (
          <DetailSection
            title="Escenarios adentro"
            action={
              canCreate &&
              venue.active && (
                <button type="button" className="button button--text detail__add" onClick={() => onAddInside(venue)}>
                  <Plus size={16} aria-hidden="true" />
                  Agregar
                </button>
              )
            }
          >
            {venue.children.length === 0 ? (
              <p className="detail__empty">
                No tiene escenarios adentro (por ejemplo, las canchas de un coliseo).
              </p>
            ) : (
              <ul className="chip-list">
                {venue.children.map((child) => (
                  <li key={child.id} className={`chip${child.active ? '' : ' is-inactive'}`}>
                    <a className="chip__link" href={`#escenarios/${child.id}`}>
                      <Building2 size={16} aria-hidden="true" />
                      {child.name}
                      {!child.active && <span className="chip__detail">Inactivo</span>}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>
        )}

        {canSeeTournaments && (
          // La key vuelve a pedir los torneos al cambiar de escenario.
          <VenueTournaments key={venue.id} venue={venue} canOpenTournaments={canOpenTournaments} />
        )}
      </DetailSide>

      <DetailActions
        noun="escenario"
        active={venue.active}
        busy={busy}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onEdit={() => onEdit(venue)}
        onToggleActive={() => onToggleActive(venue)}
        onDelete={() => onDelete(venue)}
      />
    </DetailPanel>
  )
}
