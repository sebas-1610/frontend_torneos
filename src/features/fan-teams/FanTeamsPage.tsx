import { CircleAlert, Heart, HeartOff, HeartPlus, Info, Search } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { errorMessage } from '../../api/client'
import { findFollowableTeams, findMyTeams, followTeams, unfollowTeam, type FanTeam } from '../../api/fanTeams'
import { RESOURCES, useAccess } from '../../auth/access'
import { ActionAlert, type ActionError } from '../../components/ActionAlert'
import { AnimatedNumber } from '../../components/AnimatedNumber'
import { SubjectVisual } from '../../components/ConfirmDialog'
import { PanelHead, PageHeading } from '../../components/PageHeading'
import { TeamMonogram } from '../../components/TeamMonogram'
import { useConfirm } from '../../hooks/useConfirm'
import { useLoadList } from '../../hooks/useLoadList'
import { useToast } from '../../hooks/useToast'
import { formatDateShort } from '../../utils/dates'
import { plural } from '../../utils/plural'
import { normalize } from '../roles/labels'
import '../../components/ListPage.css'
import '../../components/CardGrid.css'
import '../../components/DetailPanel.css'
import '../../components/Vivid.css'
import '../../components/Association.css'
import '../tournaments/Tournaments.css'
import './FanTeams.css'

// "Fútbol, Fútbol sala"
function sportsOf(team: FanTeam): string {
  return team.sports.map((sport) => sport.name).join(', ')
}

// Pantalla "Equipos de interés" (HU-GE-05, del rol Aficionado): a la izquierda, los equipos activos que
// todavía no sigue, para elegir uno o varios; a la derecha, los que sigue, con "Dejar de seguir". Cuando
// uno de ellos tiene un partido nuevo, le llega un correo.
export function FanTeamsPage() {
  const { can } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const { showToast, toast } = useToast()
  const canFollow = can(RESOURCES.fanTeams, 'CREATE')
  const canUnfollow = can(RESOURCES.fanTeams, 'DELETE')
  const teamsList = useLoadList(findFollowableTeams)
  const mineList = useLoadList(findMyTeams)

  const [query, setQuery] = useState('')
  const [sportId, setSportId] = useState<number | null>(null)
  const [picked, setPicked] = useState<ReadonlySet<number>>(new Set())
  const [following, setFollowing] = useState(false)
  const [busyTeamId, setBusyTeamId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<ActionError | null>(null)
  const busy = following || busyTeamId !== null
  const mine = mineList.items

  // Se pueden seguir los activos que todavía no sigue (la lista del backend dice cuáles ya sigue).
  const eligible = useMemo(() => {
    const followed = new Set(mine.map((row) => row.team.id))
    return teamsList.items.filter((team) => !team.followed && !followed.has(team.id))
  }, [teamsList.items, mine])
  // Los deportes del filtro: los de los equipos que se pueden seguir.
  const sports = useMemo(() => {
    const byId = new Map(eligible.flatMap((team) => team.sports.map((sport) => [sport.id, sport] as const)))
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [eligible])
  const candidates = useMemo(() => {
    const text = normalize(query.trim())
    return eligible.filter(
      (team) =>
        (sportId === null || team.sports.some((sport) => sport.id === sportId)) &&
        (!text ||
          normalize(team.name).includes(text) ||
          normalize(team.shortName ?? '').includes(text) ||
          normalize(team.city).includes(text)),
    )
  }, [eligible, query, sportId])
  // Lo elegido que todavía se puede seguir.
  const chosen = eligible.filter((team) => picked.has(team.id))

  const finding = mineList.loading
    ? 'Cargando tus equipos…'
    : mineList.loadError
      ? 'No se pudieron cargar tus equipos.'
      : mine.length === 0
        ? 'Todavía no sigues a ningún equipo: elige los que te interesan y te avisamos de sus partidos.'
        : `Sigues a ${plural(mine.length, 'equipo', 'equipos')}. Cuando uno tenga un partido nuevo, te llega un correo.`

  function toggle(teamId: number) {
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(teamId)) next.delete(teamId)
      else next.add(teamId)
      return next
    })
  }

  async function follow() {
    if (chosen.length === 0) return
    setFollowing(true)
    setActionError(null)
    try {
      await followTeams(chosen.map((team) => team.id))
      showToast(chosen.length === 1 ? `Ahora sigues a ${chosen[0].name}.` : `Ahora sigues a ${chosen.length} equipos más.`)
      setPicked(new Set())
      setQuery('')
      mineList.reload()
      teamsList.reload()
    } catch (err) {
      // Todo o nada: si uno no se puede seguir, no se sigue ninguno y el mensaje dice cuál.
      setActionError({
        title: chosen.length === 1 ? `No se pudo seguir a ${chosen[0].name}` : 'No se siguió ningún equipo',
        message: errorMessage(err),
      })
      mineList.reload()
      teamsList.reload()
    } finally {
      setFollowing(false)
    }
  }

  async function unfollow(team: FanTeam) {
    const confirmed = await confirm({
      title: `¿Dejar de seguir a ${team.name}?`,
      message: 'Ya no te llegarán correos de sus partidos nuevos. Puedes volver a seguirlo cuando quieras.',
      confirmLabel: 'Dejar de seguir',
      subject: <SubjectVisual visual={<TeamMonogram team={team} size="sm" />} name={team.name} detail={team.city} />,
    })
    if (!confirmed) return
    setBusyTeamId(team.id)
    setActionError(null)
    try {
      await unfollowTeam(team.id)
      showToast(`Ya no sigues a ${team.name}.`)
      mineList.reload()
      teamsList.reload()
    } catch (err) {
      setActionError({ title: `No se pudo dejar de seguir a ${team.name}`, message: errorMessage(err) })
      mineList.reload()
    } finally {
      setBusyTeamId(null)
    }
  }

  return (
    <div className="page page--vivid">
      <PageHeading icon={Heart} title="Equipos de interés" finding={finding} />

      {actionError && <ActionAlert error={actionError} onDismiss={() => setActionError(null)} />}

      <div className={canFollow ? 'assoc' : undefined}>
        {canFollow && (
          <section className="panel" aria-labelledby="followable-title" aria-busy={teamsList.loading}>
            <PanelHead
              icon={HeartPlus}
              title="Equipos para seguir"
              titleId="followable-title"
              count={teamsList.loading || teamsList.loadError ? null : plural(eligible.length, 'equipo', 'equipos')}
            />

            {teamsList.loadError ? (
              <div className="inline-error" role="alert">
                <CircleAlert size={16} aria-hidden="true" />
                <span>{teamsList.loadError}</span>
                <button type="button" className="text-action" onClick={teamsList.retry}>
                  Reintentar
                </button>
              </div>
            ) : teamsList.loading ? (
              <p className="empty-state">Cargando equipos…</p>
            ) : (
              <>
                <div className="list-filters fan-filters">
                  <label className="list-search assoc__search">
                    <Search size={16} aria-hidden="true" />
                    <input
                      type="search"
                      placeholder="Buscar por nombre o ciudad"
                      aria-label="Buscar equipos para seguir"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  {sports.length > 1 && (
                    <select
                      aria-label="Filtrar por deporte"
                      value={sportId ?? ''}
                      onChange={(e) => setSportId(e.target.value === '' ? null : Number(e.target.value))}
                    >
                      <option value="">Todos los deportes</option>
                      {sports.map((sport) => (
                        <option key={sport.id} value={sport.id}>
                          {sport.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="enroll-bar">
                  <p className="enroll-bar__count" aria-live="polite">
                    {chosen.length === 0
                      ? 'Elige uno o varios equipos.'
                      : `${plural(chosen.length, 'equipo elegido', 'equipos elegidos')}.`}
                  </p>
                  {chosen.length > 0 && (
                    <button type="button" className="button button--text" disabled={busy} onClick={() => setPicked(new Set())}>
                      Quitar selección
                    </button>
                  )}
                  <button
                    type="button"
                    className="button button--primary"
                    disabled={busy || chosen.length === 0}
                    onClick={follow}
                  >
                    <HeartPlus size={16} aria-hidden="true" />
                    {following ? 'Siguiendo…' : chosen.length > 1 ? `Seguir ${chosen.length} equipos` : 'Seguir'}
                  </button>
                </div>

                {candidates.length === 0 ? (
                  <p className="empty-state">
                    {eligible.length > 0
                      ? 'Ningún equipo coincide con la búsqueda.'
                      : teamsList.items.length > 0
                        ? 'Ya sigues a todos los equipos activos.'
                        : 'Todavía no hay equipos activos para seguir.'}
                  </p>
                ) : (
                  <ul className="card-grid" aria-label="Equipos que puedes seguir">
                    {candidates.map((team, index) => {
                      const checked = picked.has(team.id)
                      return (
                        <li key={team.id} className="card-grid__item" style={{ '--i': index } as CSSProperties}>
                          <label
                            className={`entity-card entity-card--center entity-card--pick${checked ? ' is-selected' : ''}`}
                          >
                            <input
                              type="checkbox"
                              className="entity-card__check"
                              checked={checked}
                              disabled={busy}
                              onChange={() => toggle(team.id)}
                            />
                            <span className="entity-card__visual">
                              <TeamMonogram team={team} size="lg" />
                            </span>
                            <span className="entity-card__name">{team.name}</span>
                            <span className="entity-card__meta">{team.city}</span>
                            {team.sports.length > 0 && <span className="entity-card__meta fan-card__sports">{sportsOf(team)}</span>}
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </>
            )}
          </section>
        )}

        <section className="panel" aria-labelledby="followed-title" aria-busy={mineList.loading}>
          <PanelHead
            icon={Heart}
            title="Equipos que sigues"
            titleId="followed-title"
            count={mineList.loading || mineList.loadError ? null : plural(mine.length, 'equipo', 'equipos')}
          />

          {mineList.loadError ? (
            <div className="inline-error" role="alert">
              <CircleAlert size={16} aria-hidden="true" />
              <span>{mineList.loadError}</span>
              <button type="button" className="text-action" onClick={mineList.retry}>
                Reintentar
              </button>
            </div>
          ) : mineList.loading ? (
            <p className="empty-state">Cargando tus equipos…</p>
          ) : (
            <>
              <div className="score">
                <p className="score__figure">
                  <AnimatedNumber value={mine.length} className="score__value" />
                  <span className="score__of">{mine.length === 1 ? 'equipo que sigues' : 'equipos que sigues'}</span>
                </p>
              </div>

              {mine.length === 0 ? (
                <p className="empty-state">
                  {canFollow ? 'Elige tus equipos en la lista de la izquierda.' : 'Todavía no sigues a ningún equipo.'}
                </p>
              ) : (
                <ul className="detail-list assoc__list">
                  {mine.map(({ team, since }) => (
                    <li key={team.id} className="detail-list__item">
                      <TeamMonogram team={team} size="md" />
                      <span className="detail-list__name">
                        {team.name}
                        <span className="detail-list__detail">
                          {[team.city, sportsOf(team), `desde el ${formatDateShort(since.slice(0, 10))}`]
                            .filter(Boolean)
                            .join(' · ')}
                          {team.active ? '' : ' · Equipo desactivado'}
                        </span>
                      </span>
                      {canUnfollow && (
                        <button
                          type="button"
                          className="button button--text row-actions__danger"
                          disabled={busy}
                          aria-label={`Dejar de seguir a ${team.name}`}
                          onClick={() => unfollow(team)}
                        >
                          <HeartOff size={16} aria-hidden="true" />
                          <span className="assoc__label">
                            {busyTeamId === team.id ? 'Quitando…' : 'Dejar de seguir'}
                          </span>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <p className="assoc__note">
            <Info size={16} aria-hidden="true" />
            Cuando uno de tus equipos tenga un partido nuevo, te llega un correo con la fecha del partido.
          </p>
        </section>
      </div>
      {confirmDialog}
      {toast}
    </div>
  )
}
