import { Activity, Ban, CircleCheck, Clock, Flag, Goal, UserRoundX, Users } from 'lucide-react'
import type { DevelopmentSummary } from '../../api/development'
import { PanelHead } from '../../components/PageHeading'

// "Estado de la competencia" (HU-GC-08): el anillo con lo que lleva el torneo y sus cifras. El arco es
// dorado porque es un dato.
export function CompetitionStatus({ summary }: { summary: DevelopmentSummary }) {
  return (
    <section className="panel dev-status" aria-labelledby="dev-status-title">
      <PanelHead icon={Activity} title="Estado de la competencia" titleId="dev-status-title" />
      <div className="dev-status__body">
        <ProgressRing value={summary.progress} />
        <dl className="facts facts--icons dev-status__facts">
          <div>
            <dt>
              <Flag size={16} aria-hidden="true" />
              Fase actual
            </dt>
            <dd>{summary.currentPhase?.name ?? <span className="dash">—</span>}</dd>
          </div>
          <div>
            <dt>
              <Users size={16} aria-hidden="true" />
              Equipos activos
            </dt>
            <dd className="num">{summary.activeTeams}</dd>
          </div>
          <div>
            <dt>
              <UserRoundX size={16} aria-hidden="true" />
              Equipos eliminados
            </dt>
            <dd className="num">{summary.eliminatedTeams}</dd>
          </div>
          <div>
            <dt>
              <CircleCheck size={16} aria-hidden="true" />
              Partidos jugados
            </dt>
            <dd className="num">{summary.finished}</dd>
          </div>
          <div>
            <dt>
              <Clock size={16} aria-hidden="true" />
              Partidos pendientes
            </dt>
            <dd className="num">{summary.pending}</dd>
          </div>
          {summary.cancelled > 0 && (
            <div>
              <dt>
                <Ban size={16} aria-hidden="true" />
                Partidos cancelados
              </dt>
              <dd className="num">{summary.cancelled}</dd>
            </div>
          )}
          <div>
            <dt>
              <Goal size={16} aria-hidden="true" />
              Total anotado
            </dt>
            <dd className="num">{summary.totalScored}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

const RADIUS = 52
const LENGTH = 2 * Math.PI * RADIUS

// El porcentaje del torneo completado: una pista y, encima, el arco dorado de lo jugado.
function ProgressRing({ value }: { value: number }) {
  return (
    <div className="progress-ring" role="img" aria-label={`${value} % del torneo completado`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="progress-ring__track" cx="60" cy="60" r={RADIUS} />
        {value > 0 && (
          <circle
            className="progress-ring__value"
            cx="60"
            cy="60"
            r={RADIUS}
            strokeDasharray={LENGTH}
            strokeDashoffset={LENGTH * (1 - value / 100)}
          />
        )}
      </svg>
      <span className="progress-ring__text" aria-hidden="true">
        <span className="progress-ring__figure">
          {value}
          <span className="progress-ring__unit">%</span>
        </span>
        <span className="progress-ring__label">completado</span>
      </span>
    </div>
  )
}
