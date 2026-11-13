import { ChartNoAxesColumnIncreasing, CircleAlert } from 'lucide-react'
import { useCallback, useState } from 'react'
import { PageHeading } from '../../components/PageHeading'
import { PlayerSearch } from '../../components/PlayerSearch'
import { useLoad } from '../../hooks/useLoad'
import { plural } from '../../utils/plural'
import type { SportsProfileSource } from './profileSource'
import { ProfileView } from './ProfileView'
import './SportsProfilePage.css'

// La URL dice qué jugador está abierto (#perfil-deportivo/{id}): al recargar se abre el mismo.
function showPlayerInUrl(playerId: number) {
  window.history.replaceState(null, '', `#perfil-deportivo/${playerId}`)
}

interface SportsProfilePageProps {
  source: SportsProfileSource // de dónde salen los jugadores y los perfiles (profileSource.ts)
  initialPlayerId: number | null // jugador pedido en la URL, por ejemplo desde su detalle en Jugadores
}

// Pantalla "Perfil deportivo" (HU-GD-08). Su única tarea es elegir al jugador: carga entre quiénes
// buscar, lee y escribe la URL y le pasa el elegido a ProfileView, que es quien arma el perfil.
export function SportsProfilePage({ source, initialPlayerId }: SportsProfilePageProps) {
  const fetchPlayers = useCallback(() => source.findPlayers(), [source])
  const { data, loading, loadError, retry } = useLoad(fetchPlayers)
  const players = data ?? []
  const [playerId, setPlayerId] = useState<number | null>(initialPlayerId)

  // El de la URL; si no hay o ya no existe, el primero activo (o el primero).
  const player =
    players.find((item) => item.id === playerId) ?? players.find((item) => item.active) ?? players[0] ?? null

  const finding = loading
    ? 'Cargando jugadores…'
    : loadError
      ? 'No se pudo cargar la lista de jugadores.'
      : players.length === 0
        ? 'Todavía no hay jugadores registrados.'
        : `${plural(players.length, 'jugador registrado', 'jugadores registrados')}. ` +
          'Busca uno por nombre o documento para ver su información, sus equipos y sus habilidades.'

  return (
    <div className="page page--vivid">
      <PageHeading icon={ChartNoAxesColumnIncreasing} title="Perfil deportivo" finding={finding} />

      {loadError ? (
        <section className="panel">
          <div className="inline-error" role="alert">
            <CircleAlert size={16} aria-hidden="true" />
            <span>{loadError}</span>
            <button type="button" className="text-action" onClick={retry}>
              Reintentar
            </button>
          </div>
        </section>
      ) : loading ? (
        <section className="panel" aria-busy="true">
          <p className="empty-state">Cargando jugadores…</p>
        </section>
      ) : !player ? (
        <section className="panel">
          <p className="empty-state">Primero registra un jugador en la pantalla Jugadores.</p>
        </section>
      ) : (
        <>
          <section className="panel profile-search" aria-label="Buscar jugador">
            <span className="profile-search__label">Buscar jugador</span>
            <PlayerSearch
              players={players}
              label="Buscar por nombre o documento"
              onChoose={(chosen) => {
                setPlayerId(chosen.id)
                showPlayerInUrl(chosen.id)
              }}
            />
          </section>
          {/* La key vuelve a montar el perfil al cambiar de jugador: lo carga desde cero. */}
          <ProfileView key={player.id} source={source} playerId={player.id} />
        </>
      )}
    </div>
  )
}
