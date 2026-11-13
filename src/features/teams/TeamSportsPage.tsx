import { ArrowLeft, CircleAlert, Info, Link2, Plus, Search, Unlink } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { errorMessage } from '../../api/client'
import { findSports, type Sport, type SportSummary } from '../../api/sports'
import { associateSport, dissociateSport } from '../../api/teamSports'
import { findTeams } from '../../api/teams'
import { RESOURCES, useAccess } from '../../auth/access'
import { AnimatedNumber } from '../../components/AnimatedNumber'
import { SubjectBreak, SubjectVisual } from '../../components/ConfirmDialog'
import { PageHeading } from '../../components/PageHeading'
import { SportIcon } from '../../components/SportIcon'
import { TeamMonogram } from '../../components/TeamMonogram'
import { TeamPicker } from '../../components/TeamPicker'
import { useConfirm } from '../../hooks/useConfirm'
import { useLoadList } from '../../hooks/useLoadList'
import { useToast } from '../../hooks/useToast'
import { normalize } from '../roles/labels'
import { kindOfSummary } from '../sports/sportKind'
import { treeOrder } from '../sports/sportTree'
import '../../components/ListPage.css'
import '../../components/CardGrid.css'
import '../../components/DetailPanel.css'
import '../../components/Vivid.css'
import '../../components/Association.css'

// La URL dice qué equipo está abierto (#equipos-deportes/{id}): al recargar se abre el mismo.
// replaceState no agrega pasos al botón "Atrás" del navegador.
function showTeamInUrl(teamId: number) {
  window.history.replaceState(null, '', `#equipos-deportes/${teamId}`)
}

interface TeamSportsPageProps {
  initialTeamId: number | null // equipo pedido en la URL, por ejemplo desde "Asociar" en Equipos
}

// Pantalla "Asociar deportes" (HU-GD-03): se elige un equipo y se le asocian o retiran deportes.
// A la izquierda, los deportes disponibles; a la derecha, los que ya tiene.
export function TeamSportsPage({ initialTeamId }: TeamSportsPageProps) {
  const { can } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const { showToast, toast } = useToast()
  const canAssociate = can(RESOURCES.teamSports, 'CREATE')
  const canDissociate = can(RESOURCES.teamSports, 'DELETE')

  const teamsList = useLoadList(findTeams)
  const sportsList = useLoadList(findSports)
  const teams = teamsList.items
  const sports = sportsList.items
  const loading = teamsList.loading || sportsList.loading
  const loadError = teamsList.loadError ?? sportsList.loadError

  const [teamId, setTeamId] = useState<number | null>(initialTeamId)
  const [query, setQuery] = useState('')
  const [busySportId, setBusySportId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // El de la URL; si no hay o ya no existe, el primero activo (o el primero).
  const team = teams.find((item) => item.id === teamId) ?? teams.find((item) => item.active) ?? teams[0] ?? null

  // Disponibles: deportes activos que el equipo todavía no tiene, en el orden de la pantalla Deportes.
  const available = useMemo(() => {
    if (!team) return []
    const taken = new Set(team.sports.map((sport) => sport.id))
    const text = normalize(query.trim())
    return treeOrder(sports)
      .map((row) => row.sport)
      .filter((sport) => sport.active && !taken.has(sport.id) && (!text || normalize(sport.name).includes(text)))
  }, [sports, team, query])

  const freeCount = team
    ? sports.filter((sport) => sport.active && !team.sports.some((own) => own.id === sport.id)).length
    : 0

  const finding = loading
    ? 'Cargando equipos y deportes…'
    : loadError
      ? 'No se pudieron cargar los equipos y los deportes.'
      : !team
        ? 'Todavía no hay equipos registrados.'
        : team.sports.length === 0
          ? `${team.name} todavía no participa en ningún deporte.`
          : `${team.name} participa en ${team.sports.length} ${team.sports.length === 1 ? 'deporte' : 'deportes'}.`

  function chooseTeam(id: number) {
    setTeamId(id)
    setActionError(null)
    setQuery('')
    showTeamInUrl(id)
  }

  async function run(sportId: number, action: () => Promise<void>) {
    setBusySportId(sportId)
    setActionError(null)
    try {
      await action()
      teamsList.reload() // la lista de equipos trae los deportes de cada uno
      sportsList.reload() // y la de deportes, cuántos equipos tiene cada uno
    } catch (err) {
      setActionError(errorMessage(err)) // ej: 409 si otra persona ya lo asoció
    } finally {
      setBusySportId(null)
    }
  }

  async function associate(sport: Sport) {
    if (!team) return
    await run(sport.id, async () => {
      await associateSport(team.id, sport.id)
      showToast(`${sport.name} quedó asociado a ${team.name}.`)
    })
  }

  async function dissociate(sport: SportSummary) {
    if (!team) return
    const confirmed = await confirm({
      title: `¿Retirar ${sport.name} de ${team.name}?`,
      message: 'Solo se retira la asociación: el equipo y el deporte siguen registrados.',
      confirmLabel: 'Retirar asociación',
      subject: (
        <>
          <SubjectVisual visual={<TeamMonogram team={team} size="sm" />} name={team.name} detail="Equipo" />
          <SubjectBreak />
          <SubjectVisual
            visual={<SportIcon kind={kindOfSummary(sport, sports)} id={sport.id} size={20} />}
            name={sport.name}
            detail="Deporte"
          />
        </>
      ),
    })
    if (!confirmed) return
    await run(sport.id, async () => {
      await dissociateSport(team.id, sport.id)
      showToast(`${sport.name} ya no está asociado a ${team.name}.`)
    })
  }

  return (
    <div className="page page--vivid">
      <PageHeading icon={Link2} title="Asociar deportes" finding={finding}>
        <a className="button button--outline" href="#equipos">
          <ArrowLeft size={18} aria-hidden="true" />
          Volver a Equipos
        </a>
      </PageHeading>

      {loadError ? (
        <section className="panel">
          <div className="inline-error" role="alert">
            <CircleAlert size={16} aria-hidden="true" />
            <span>{loadError}</span>
            <button
              type="button"
              className="text-action"
              onClick={() => {
                teamsList.retry()
                sportsList.retry()
              }}
            >
              Reintentar
            </button>
          </div>
        </section>
      ) : loading ? (
        <section className="panel" aria-busy="true">
          <p className="empty-state">Cargando equipos y deportes…</p>
        </section>
      ) : !team ? (
        <section className="panel">
          <p className="empty-state">Primero registra un equipo en la pantalla Equipos.</p>
        </section>
      ) : (
        <>
          <TeamPicker teams={teams} team={team} onChoose={chooseTeam} />

          {actionError && (
            <p className="login__error" role="alert">
              {actionError}
            </p>
          )}

          <div className="assoc">
            <section className="panel" aria-labelledby="available-title">
              <h2 id="available-title" className="panel__title detail__section-title">
                Deportes disponibles
              </h2>
              <label className="list-search assoc__search">
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Buscar deportes"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>

              {!team.active ? (
                <p className="empty-state">
                  {team.name} está desactivado: actívalo en Equipos para asociarle deportes.
                </p>
              ) : available.length === 0 ? (
                <p className="empty-state">
                  {sports.length === 0
                    ? 'No hay deportes registrados. Créalos en la pantalla Deportes.'
                    : freeCount === 0
                      ? `${team.name} ya tiene todos los deportes activos.`
                      : 'Ningún deporte disponible coincide con la búsqueda.'}
                </p>
              ) : (
                <ul className="card-grid">
                  {available.map((sport, index) => (
                    <li key={sport.id} className="card-grid__item" style={{ '--i': index } as CSSProperties}>
                      <article className="entity-card entity-card--center entity-card--static">
                        <span className="entity-card__visual">
                          <SportIcon kind={kindOfSummary(sport, sports)} id={sport.id} size={48} />
                        </span>
                        <h3 className="entity-card__name">{sport.name}</h3>
                        <p className="entity-card__meta">
                          {sport.parent ? `Subdeporte de ${sport.parent.name}` : 'Deporte principal'}
                        </p>
                        {canAssociate && (
                          <button
                            type="button"
                            className="button button--tint button--tint-green assoc__button"
                            disabled={busySportId !== null}
                            aria-label={`Asociar ${sport.name} a ${team.name}`}
                            onClick={() => associate(sport)}
                          >
                            <Plus size={16} aria-hidden="true" />
                            {busySportId === sport.id ? 'Asociando…' : 'Asociar'}
                          </button>
                        )}
                      </article>
                    </li>
                  ))}
                </ul>
              )}
              <p className="assoc__note">
                <Info size={16} aria-hidden="true" />
                Asocia los deportes en los que el equipo puede participar. Los deportes desactivados no aparecen aquí.
              </p>
            </section>

            <section className="panel" aria-labelledby="associated-title">
              <h2 id="associated-title" className="panel__title detail__section-title">
                Deportes asociados
              </h2>
              <div className="score">
                <p className="score__figure">
                  <AnimatedNumber value={team.sports.length} className="score__value" />
                  <span className="score__of">
                    {team.sports.length === 1 ? 'deporte asociado' : 'deportes asociados'}
                  </span>
                </p>
              </div>

              {team.sports.length === 0 ? (
                <p className="empty-state">Asocia el primero desde la lista de disponibles.</p>
              ) : (
                <ul className="detail-list assoc__list">
                  {team.sports.map((sport) => (
                    <li key={sport.id} className="detail-list__item">
                      <SportIcon kind={kindOfSummary(sport, sports)} id={sport.id} size={32} />
                      <span className="detail-list__name">
                        {sport.name}
                        {!sport.active && <span className="detail-list__detail">Deporte desactivado</span>}
                      </span>
                      {canDissociate && (
                        <button
                          type="button"
                          className="button button--text row-actions__danger"
                          disabled={busySportId !== null}
                          aria-label={`Retirar ${sport.name} de ${team.name}`}
                          onClick={() => dissociate(sport)}
                        >
                          <Unlink size={16} aria-hidden="true" />
                          <span className="assoc__label">Retirar asociación</span>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p className="assoc__note">
                <Info size={16} aria-hidden="true" />
                Retirar una asociación no borra el equipo ni el deporte.
              </p>
            </section>
          </div>
        </>
      )}
      {confirmDialog}
      {toast}
    </div>
  )
}
