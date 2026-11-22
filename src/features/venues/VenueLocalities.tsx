import { Armchair, Pencil, Plus, Power, PowerOff, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { errorMessage } from '../../api/client'
import {
  deleteLocality,
  disableLocality,
  enableLocality,
  findLocalitiesByVenue,
  type Locality,
} from '../../api/localities'
import type { Venue } from '../../api/venues'
import { ActionAlert, type ActionError } from '../../components/ActionAlert'
import { SubjectItem } from '../../components/ConfirmDialog'
import { DetailSection } from '../../components/DetailPanel'
import { RowAction } from '../../components/ListView'
import { useConfirm } from '../../hooks/useConfirm'
import { useLoadList } from '../../hooks/useLoadList'
import { LocalityFormDialog } from './LocalityFormDialog'
import { seats } from './venueInfo'

// Lo que la sesión puede hacer con las localidades; lo decide la pantalla con los permisos.
export interface LocalityAbilities {
  list: boolean
  create: boolean
  update: boolean
  remove: boolean
}

interface VenueLocalitiesProps {
  venue: Venue
  abilities: LocalityAbilities
  onChanged: () => void // cambió la capacidad del escenario
  onToast: (message: string) => void
}

// Las localidades del escenario, por nombre (HU-GE-03), con agregar, editar, activar o desactivar y
// eliminar. Sin permiso para listarlas se ven las que trae el escenario, sin acciones.
export function VenueLocalities({ venue, abilities, onChanged, onToast }: VenueLocalitiesProps) {
  const { confirm, confirmDialog } = useConfirm()
  const fetchLocalities = useCallback(() => findLocalitiesByVenue(venue.id), [venue.id])
  const { items, loading, loadError, reload, retry } = useLoadList(fetchLocalities, abilities.list)
  const [form, setForm] = useState<{ locality: Locality | null } | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<ActionError | null>(null)

  const localities: Pick<Locality, 'id' | 'name' | 'capacity' | 'active' | 'description'>[] = abilities.list
    ? items
    : venue.localities.map((locality) => ({ ...locality, description: null }))
  // Se crean y se activan solo en un escenario que se puede usar (el backend lo valida igual).
  const canCreate = abilities.list && abilities.create && venue.available

  async function run(locality: Pick<Locality, 'id' | 'name'>, failTitle: string, action: () => Promise<string>) {
    setBusyId(locality.id)
    setActionError(null)
    try {
      onToast(await action())
      reload()
      onChanged()
    } catch (err) {
      setActionError({ title: failTitle, message: errorMessage(err) })
    } finally {
      setBusyId(null)
    }
  }

  async function toggle(locality: Locality) {
    if (locality.active) {
      const confirmed = await confirm({
        title: `¿Desactivar ${locality.name}?`,
        message:
          'Deja de contar en la capacidad del escenario y no se puede poner a la venta en partidos nuevos. ' +
          'Los boletos que ya tiene se conservan.',
        confirmLabel: 'Desactivar localidad',
        tone: 'neutral',
        subject: <SubjectItem icon={Armchair} name={locality.name} detail={seats(locality.capacity)} />,
      })
      if (!confirmed) return
    }
    await run(
      locality,
      locality.active ? 'No se pudo desactivar la localidad' : 'No se pudo activar la localidad',
      async () => {
        const saved = await (locality.active ? disableLocality(locality.id) : enableLocality(locality.id))
        return saved.active ? `${saved.name} quedó activa.` : `${saved.name} quedó desactivada.`
      },
    )
  }

  async function remove(locality: Locality) {
    const confirmed = await confirm({
      title: `¿Eliminar ${locality.name}?`,
      message:
        'Se borra del escenario. Si tiene boletos vendidos o precio en la venta de entradas de algún partido no ' +
        'se puede eliminar: en ese caso, desactívala.',
      confirmLabel: 'Eliminar localidad',
      subject: <SubjectItem icon={Armchair} name={locality.name} detail={seats(locality.capacity)} />,
    })
    if (!confirmed) return
    await run(locality, 'No se puede eliminar la localidad', async () => {
      await deleteLocality(locality.id)
      return `Se eliminó ${locality.name}.`
    })
  }

  const hasActions = abilities.list && (abilities.update || abilities.remove)

  return (
    <DetailSection
      title="Localidades"
      action={
        canCreate && (
          <button
            type="button"
            className="button button--text detail__add detail__add--glow"
            onClick={() => setForm({ locality: null })}
          >
            <Plus size={16} aria-hidden="true" />
            Agregar
          </button>
        )
      }
    >
      {actionError && <ActionAlert error={actionError} onDismiss={() => setActionError(null)} />}
      {abilities.list && loading ? (
        <p className="detail__empty">Cargando localidades…</p>
      ) : abilities.list && loadError ? (
        <p className="detail__empty">
          No se pudieron cargar las localidades: {loadError}{' '}
          <button type="button" className="text-action" onClick={retry}>
            Reintentar
          </button>
        </p>
      ) : localities.length === 0 ? (
        <p className="detail__empty">
          {canCreate
            ? 'Todavía no tiene localidades: crea la primera con "Agregar" (ej: Tribuna Norte, 4.500 puestos).'
            : `${venue.name} no tiene localidades.`}
        </p>
      ) : (
        <ul className="locality-list" aria-label={`Localidades de ${venue.name}`}>
          {localities.map((locality) => (
            <li key={locality.id} className={`locality-row${locality.active ? '' : ' is-inactive'}`}>
              <Armchair size={16} className="locality-row__icon" aria-hidden="true" />
              <span className="locality-row__text">
                <span className="locality-row__name">{locality.name}</span>
                {(locality.description || !locality.active) && (
                  <span className="locality-row__detail">
                    {locality.active ? locality.description : 'Desactivada: no cuenta en la capacidad'}
                  </span>
                )}
              </span>
              <span className="locality-row__seats" title={seats(locality.capacity)}>
                {locality.capacity.toLocaleString('es-CO')}
              </span>
              {hasActions && (
                <span className="row-actions">
                  {abilities.update && (
                    <>
                      <RowAction
                        icon={Pencil}
                        title="Editar localidad"
                        label={`Editar ${locality.name}`}
                        disabled={busyId !== null}
                        onClick={() => setForm({ locality: locality as Locality })}
                      />
                      <RowAction
                        icon={locality.active ? PowerOff : Power}
                        tone={locality.active ? 'red' : 'green'}
                        title={locality.active ? 'Desactivar localidad' : 'Activar localidad'}
                        label={`${locality.active ? 'Desactivar' : 'Activar'} ${locality.name}`}
                        disabled={busyId !== null || (!locality.active && !venue.available)}
                        onClick={() => toggle(locality as Locality)}
                      />
                    </>
                  )}
                  {abilities.remove && (
                    <RowAction
                      icon={Trash2}
                      tone="red"
                      title="Eliminar localidad"
                      label={`Eliminar ${locality.name}`}
                      disabled={busyId !== null}
                      onClick={() => remove(locality as Locality)}
                    />
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {abilities.list && abilities.create && !venue.available && (
        <p className="detail__empty detail__note">Activa el escenario para agregarle localidades.</p>
      )}

      {form && (
        <LocalityFormDialog
          venue={venue}
          locality={form.locality}
          onClose={() => setForm(null)}
          onSaved={(saved, isNew) => {
            setForm(null)
            setActionError(null)
            onToast(isNew ? `${saved.name} quedó registrada.` : 'Cambios guardados.')
            reload()
            onChanged()
          }}
        />
      )}
      {confirmDialog}
    </DetailSection>
  )
}
