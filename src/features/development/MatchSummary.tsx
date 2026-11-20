import { Eye, Info } from 'lucide-react'
import type { Ref } from 'react'
import type { DevelopmentMatch } from '../../api/development'
import { canOpenPage, useAccess } from '../../auth/access'
import { DetailSection } from '../../components/DetailPanel'
import { PanelHead } from '../../components/PageHeading'
import { Scoreboard } from '../matches/MatchVisuals'
import { ScoreList } from '../matches/ScoreList'

interface MatchSummaryProps {
  ref?: Ref<HTMLElement>
  match: DevelopmentMatch | null
  tournamentId: number
  emptyMessage: string // si no hay partido que mostrar
}

// "Detalle del partido" (HU-GC-08): el elegido en las tarjetas o en las llaves, con su marcador y sus
// anotaciones. Solo se consulta: para cambiarlo, "Ver en Partidos" lo abre allá ya elegido.
export function MatchSummary({ ref, match, tournamentId, emptyMessage }: MatchSummaryProps) {
  const { can } = useAccess()
  return (
    <section ref={ref} className="panel dev-match" aria-labelledby="dev-match-title">
      <PanelHead icon={Info} title="Detalle del partido" titleId="dev-match-title" />
      {!match ? (
        <p className="empty-state">{emptyMessage}</p>
      ) : (
        <>
          <Scoreboard match={match} />
          <DetailSection title="Anotaciones">
            {match.status === 'PROGRAMADO' ? (
              <p className="detail__empty">Las anotaciones aparecen cuando el partido empieza.</p>
            ) : match.scores.length === 0 ? (
              <p className="detail__empty">Este partido no tiene anotaciones.</p>
            ) : (
              <ScoreList match={match} scores={match.scores} />
            )}
          </DetailSection>
          {canOpenPage('torneos-partidos', can) && (
            <a className="button button--outline dev-match__open" href={`#torneos-partidos/${tournamentId}/${match.id}`}>
              <Eye size={16} aria-hidden="true" />
              Ver en Partidos
            </a>
          )}
        </>
      )}
    </section>
  )
}
