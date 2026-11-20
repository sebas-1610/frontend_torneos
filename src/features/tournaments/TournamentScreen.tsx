import { ArrowLeft, CircleAlert } from 'lucide-react'
import { PageHeading, type IconType } from '../../components/PageHeading'

// Piezas de las pantallas que trabajan sobre un torneo y se abren desde su detalle (Inscripciones,
// Fases y grupos).

// Vuelve a Torneos con el mismo torneo elegido.
export function BackToTournaments({ tournamentId }: { tournamentId: number | null }) {
  return (
    <a className="button button--outline" href={tournamentId === null ? '#torneos' : `#torneos/${tournamentId}`}>
      <ArrowLeft size={18} aria-hidden="true" />
      Volver a Torneos
    </a>
  )
}

interface TournamentScreenFallbackProps {
  icon: IconType
  title: string
  loading: boolean
  loadError: string | null
  onRetry: () => void
}

// Lo que se ve mientras cargan los torneos, si no se pudieron cargar o si todavía no hay ninguno.
export function TournamentScreenFallback({ icon, title, loading, loadError, onRetry }: TournamentScreenFallbackProps) {
  return (
    <div className="page page--vivid">
      <PageHeading
        icon={icon}
        title={title}
        finding={
          loadError
            ? 'No se pudieron cargar los torneos.'
            : loading
              ? 'Cargando torneos…'
              : 'Todavía no hay torneos registrados.'
        }
      >
        <BackToTournaments tournamentId={null} />
      </PageHeading>
      <section className="panel" aria-busy={loading}>
        {loadError ? (
          <div className="inline-error" role="alert">
            <CircleAlert size={16} aria-hidden="true" />
            <span>{loadError}</span>
            <button type="button" className="text-action" onClick={onRetry}>
              Reintentar
            </button>
          </div>
        ) : (
          <p className="empty-state">
            {loading ? 'Cargando torneos…' : 'Primero registra un torneo en la pantalla Torneos.'}
          </p>
        )}
      </section>
    </div>
  )
}
