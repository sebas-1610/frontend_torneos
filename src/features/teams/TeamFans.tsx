import { useCallback, useState } from 'react'
import { findTeamFollowers } from '../../api/fanTeams'
import type { Team } from '../../api/teams'
import { DetailSection } from '../../components/DetailPanel'
import { useLoadList } from '../../hooks/useLoadList'
import { formatDateShort } from '../../utils/dates'
import { plural } from '../../utils/plural'
import './TeamFans.css'

// Aficionados que se ven de entrada; el resto, con "Ver todos".
const SHOWN = 8

// Los aficionados que siguen al equipo, del más antiguo al más reciente (HU-GE-05, criterio 8). Va en
// el detalle de Equipos. Un equipo con seguidores no se elimina: se desactiva.
export function TeamFans({ team }: { team: Team }) {
  const fetchFollowers = useCallback(() => findTeamFollowers(team.id), [team.id])
  const { items: followers, loading, loadError, retry } = useLoadList(fetchFollowers)
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? followers : followers.slice(0, SHOWN)

  return (
    <DetailSection title="Aficionados">
      {loading ? (
        <p className="detail__empty">Cargando aficionados…</p>
      ) : loadError ? (
        <p className="detail__empty">
          No se pudieron cargar los aficionados: {loadError}{' '}
          <button type="button" className="text-action" onClick={retry}>
            Reintentar
          </button>
        </p>
      ) : followers.length === 0 ? (
        <p className="detail__empty">Ningún aficionado sigue a {team.name} todavía.</p>
      ) : (
        <>
          <p className="fan-list__total num">
            {plural(followers.length, 'aficionado lo sigue', 'aficionados lo siguen')}: les llega un correo con cada
            partido nuevo.
          </p>
          <ul className="fan-list" aria-label={`Aficionados de ${team.name}`}>
            {shown.map(({ fan, since }) => (
              <li key={fan.id} className="fan-list__row">
                <span className="fan-list__email">{fan.email}</span>
                <span className="fan-list__since num">desde {formatDateShort(since.slice(0, 10))}</span>
              </li>
            ))}
          </ul>
          {followers.length > SHOWN && (
            <button type="button" className="text-action fan-list__more" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Ver menos' : `Ver los ${followers.length} aficionados`}
            </button>
          )}
        </>
      )}
    </DetailSection>
  )
}
