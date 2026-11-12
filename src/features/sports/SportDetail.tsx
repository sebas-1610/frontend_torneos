import { CircleAlert, Info, ListTree, Plus, Shield } from 'lucide-react'
import { useEffect, useState, type Ref } from 'react'
import { errorMessage } from '../../api/client'
import type { Sport } from '../../api/sports'
import type { TeamSummary } from '../../api/teams'
import { findTeamsBySport } from '../../api/teamSports'
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
import { SportIcon } from '../../components/SportIcon'
import { TeamMonogram } from '../../components/TeamMonogram'
import { hueFor } from '../../utils/hue'
import { resolveSportKind, sportKindOf } from './sportKind'

interface SportDetailProps {
  ref?: Ref<HTMLElement>
  sport: Sport | null // null: no hay deportes que mostrar
  sports: Sport[] // para el balón de los subdeportes sin palabra conocida (usan el de su padre)
  emptyMessage: string
  busy: boolean
  error: ActionError | null // la última acción rechazada (ej: no se puede eliminar porque tiene subdeportes)
  onDismissError: () => void
  canAddSub: boolean
  canUpdate: boolean
  canDelete: boolean
  canSeeTeams: boolean // asignacion-deportes · Listar: sin él solo se muestra cuántos equipos tiene
  onSelect: (sportId: number) => void
  onAddSub: (sport: Sport) => void
  onEdit: (sport: Sport) => void
  onToggleActive: (sport: Sport) => void
  onDelete: (sport: Sport) => void
}

// Panel derecho de Deportes: el deporte elegido con sus subdeportes y sus equipos (HU-GD-01 y 03).
export function SportDetail({
  ref,
  sport,
  sports,
  emptyMessage,
  busy,
  error,
  onDismissError,
  canAddSub,
  canUpdate,
  canDelete,
  canSeeTeams,
  onSelect,
  onAddSub,
  onEdit,
  onToggleActive,
  onDelete,
}: SportDetailProps) {
  if (!sport) {
    return <DetailPanel ref={ref} label="Detalle del deporte" icon={Info} emptyMessage={emptyMessage} />
  }

  const { parent, teamsCount: teams } = sport
  const subs = sport.subSports.length
  const kind = resolveSportKind(sport, sports)
  return (
    <DetailPanel
      ref={ref}
      label="Detalle del deporte"
      icon={Info}
      titleId="sport-detail-title"
      emptyMessage={null}
      error={error}
      onDismissError={onDismissError}
    >
      <DetailMain>
        <DetailHero
          glow={`hsl(${hueFor(sport.id)} 65% 48%)`}
          visual={
            <span className="hero__glyph">
              <SportIcon kind={kind} id={sport.id} size={56} />
            </span>
          }
        >
          <h3 id="sport-detail-title" className="hero__name">
            {sport.name}
          </h3>
          <span className={`pill ${sport.active ? 'pill--positive' : 'pill--neutral'}`}>
            <span className="status-dot" aria-hidden="true" />
            {sport.active ? 'Activo' : 'Inactivo'}
          </span>
          <p className="hero__meta">
            {parent ? (
              <>
                Subdeporte de{' '}
                <button type="button" className="detail__link" onClick={() => onSelect(parent.id)}>
                  {parent.name}
                </button>
              </>
            ) : (
              'Deporte principal'
            )}
          </p>
        </DetailHero>

        <StatTiles>
          <StatTile
            icon={Shield}
            tone="--tone-blue"
            value={teams}
            label={teams === 1 ? 'Equipo asociado' : 'Equipos asociados'}
          />
          <StatTile icon={ListTree} tone="--tone-green" value={subs} label={subs === 1 ? 'Subdeporte' : 'Subdeportes'} />
        </StatTiles>
        {!sport.active && (
          <p className="detail__empty detail__note">
            No recibe equipos nuevos ni puede ser deporte padre hasta que lo actives.
          </p>
        )}
      </DetailMain>

      <DetailSide>
        <DetailSection title="Descripción">
          <p className="detail-section__text">{sport.description ?? 'Sin descripción.'}</p>
        </DetailSection>

        <DetailSection
          title="Subdeportes"
          action={
            // Un deporte desactivado no puede ser padre: el backend lo rechazaría.
            canAddSub &&
            sport.active && (
              <button type="button" className="button button--text detail__add" onClick={() => onAddSub(sport)}>
                <Plus size={16} aria-hidden="true" />
                Agregar
              </button>
            )
          }
        >
          {subs === 0 ? (
            <p className="detail__empty">{sport.name} no tiene subdeportes.</p>
          ) : (
            <ul className="detail-list">
              {sport.subSports.map((sub) => {
                const subKind = sportKindOf(sub.name)
                return (
                  <li key={sub.id}>
                    <button
                      type="button"
                      className="detail-list__item detail-list__button"
                      onClick={() => onSelect(sub.id)}
                    >
                      <SportIcon kind={subKind === 'generic' ? kind : subKind} id={sub.id} size={26} />
                      <span className="detail-list__name">{sub.name}</span>
                      {!sub.active && <span className="pill pill--neutral">Inactivo</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </DetailSection>

        {canSeeTeams && (
          <DetailSection title="Equipos asociados">
            {/* La key vuelve a pedir la lista al cambiar de deporte o cuando cambia su cantidad de equipos. */}
            <SportTeams key={`${sport.id}:${teams}`} sport={sport} />
          </DetailSection>
        )}
      </DetailSide>

      <DetailActions
        noun="deporte"
        active={sport.active}
        busy={busy}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onEdit={() => onEdit(sport)}
        onToggleActive={() => onToggleActive(sport)}
        onDelete={() => onDelete(sport)}
      />
    </DetailPanel>
  )
}

function SportTeams({ sport }: { sport: Sport }) {
  const [teams, setTeams] = useState<TeamSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    findTeamsBySport(sport.id)
      .then((list) => {
        if (active) setTeams(list)
      })
      .catch((err) => {
        if (active) setError(errorMessage(err))
      })
    return () => {
      active = false
    }
  }, [sport.id, attempt])

  if (error) {
    return (
      <div className="inline-error" role="alert">
        <CircleAlert size={16} aria-hidden="true" />
        <span>{error}</span>
        <button
          type="button"
          className="text-action"
          onClick={() => {
            setError(null)
            setAttempt((value) => value + 1)
          }}
        >
          Reintentar
        </button>
      </div>
    )
  }
  if (teams === null) {
    return (
      <p className="detail__empty" aria-busy="true">
        Cargando equipos…
      </p>
    )
  }
  if (teams.length === 0) {
    return <p className="detail__empty">Ningún equipo participa en {sport.name} todavía.</p>
  }
  return (
    <ul className="detail-list">
      {teams.map((team) => (
        <li key={team.id} className="detail-list__item">
          <TeamMonogram team={team} size="sm" />
          <span className="detail-list__name">{team.name}</span>
          {!team.active && <span className="pill pill--neutral">Inactivo</span>}
        </li>
      ))}
    </ul>
  )
}
