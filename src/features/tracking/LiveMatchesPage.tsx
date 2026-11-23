import { Eye, Radar } from 'lucide-react'
import { useMemo, useState } from 'react'
import { findTrackedMatches, type TrackedMatch } from '../../api/tracking'
import { ListPanel, ListToolbar, RowAction, RowActions } from '../../components/ListView'
import { PageHeading } from '../../components/PageHeading'
import { useLoadList } from '../../hooks/useLoadList'
import { normalize } from '../roles/labels'
import { matchTitle, matchWhen } from '../matches/matchInfo'
import { MatchStatusTag, MatchVersus } from '../matches/MatchVisuals'
import { TrackingStatusTag } from './TrackingVisuals'
import './Tracking.css'

function liveSentence(items: TrackedMatch[]): string {
  const playing = items.filter((item) => item.match.status === 'EN_JUEGO').length
  const active = items.filter((item) => item.tracking.status === 'ACTIVO').length
  if (items.length === 0) return 'Ningún partido está en juego ni tiene seguimiento.'
  const playingText = playing === 0 ? 'Ningún partido en juego' : `${playing} ${playing === 1 ? 'partido en juego' : 'partidos en juego'}`
  const activeText = active === 0 ? 'ninguno con seguimiento activo' : `${active} con seguimiento activo`
  return `${playingText}; ${activeText}.`
}

function seguimientoHref(matchId: number): string {
  return `#seguimiento/${matchId}`
}

// "En vivo" (HU-GC-09): los partidos en juego y los que ya tuvieron seguimiento, para abrir su pizarra.
// Primero los que están en juego. Es la entrada del aficionado; el administrador también la ve.
export function LiveMatchesPage() {
  const { items, loading, loadError, retry } = useLoadList(findTrackedMatches)
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const text = normalize(query.trim())
    if (!text) return items
    return items.filter(({ match }) =>
      normalize(`${match.homeTeam.name} ${match.awayTeam.name} ${match.tournament.name}`).includes(text),
    )
  }, [items, query])

  const finding = loading ? 'Cargando partidos…' : loadError ? 'No se pudieron cargar los partidos.' : liveSentence(items)

  return (
    <div className="page page--vivid">
      <PageHeading icon={Radar} title="En vivo" finding={finding} />

      <ListToolbar query={query} onQueryChange={setQuery} placeholder="Buscar por equipo o torneo" />

      <ListPanel
        title="Partidos en vivo y con seguimiento"
        titleId="live-matches-title"
        icon={Radar}
        noun={['partido', 'partidos']}
        total={items.length}
        shown={visible.length}
        loading={loading}
        loadError={loadError}
        onRetry={retry}
        emptyMessage={
          visible.length > 0
            ? null
            : items.length > 0
              ? 'Ningún partido coincide con la búsqueda.'
              : 'Cuando un partido empiece, aparecerá aquí para seguirlo en vivo.'
        }
      >
        <div className="table-scroll">
          <table className="data-table data-table--select data-table--rows matches-table live-table">
            <thead>
              <tr>
                <th className="data-table__optional">Fecha</th>
                <th>Partido</th>
                <th className="data-table__optional">Torneo</th>
                <th className="data-table__optional">Estado</th>
                <th>Seguimiento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ match, tracking }) => {
                const when = matchWhen(match.scheduledAt)
                return (
                  <tr key={match.id} onClick={() => (window.location.hash = seguimientoHref(match.id))}>
                    <td className="data-table__optional">
                      <span className="cell-lines num">
                        <span>{when.date}</span>
                        <span className="cell-lines__detail">{when.time}</span>
                      </span>
                    </td>
                    <td className="data-table__name">
                      <MatchVersus match={match} />
                      <span className="matches-table__when num">
                        {when.date} · {when.time} · {match.tournament.name}
                      </span>
                    </td>
                    <td className="data-table__optional">
                      <span className="cell-lines">
                        <span>{match.tournament.name}</span>
                        <span className="cell-lines__detail">{match.phase.name}</span>
                      </span>
                    </td>
                    <td className="data-table__optional">
                      <MatchStatusTag status={match.status} />
                    </td>
                    <td>
                      <TrackingStatusTag status={tracking.status} />
                    </td>
                    <RowActions>
                      <RowAction
                        icon={Eye}
                        title="Ver pizarra"
                        label={`Ver la pizarra de ${matchTitle(match)}`}
                        href={seguimientoHref(match.id)}
                      />
                    </RowActions>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </ListPanel>
    </div>
  )
}
