import type { CSSProperties } from 'react'
import type { Phase } from '../../api/phases'
import { DetailSection } from '../../components/DetailPanel'
import { PHASE_TYPES } from './phaseInfo'
import './Phases.css'

interface PhaseTrailProps {
  tournamentName: string
  phases: Phase[] // en orden
  loading: boolean
  loadError: string | null
}

// Las fases del torneo en el orden en que se juegan (HU-GC-03: consultar las fases de un torneo). Va en
// el detalle de Torneos; la pantalla Fases y grupos se abre con su tarjeta.
export function PhaseTrail({ tournamentName, phases, loading, loadError }: PhaseTrailProps) {
  return (
    <DetailSection title="Fases">
      {loading ? (
        <p className="detail__empty">Cargando fases…</p>
      ) : loadError ? (
        <p className="detail__empty">No se pudieron cargar las fases: {loadError}</p>
      ) : phases.length === 0 ? (
        <p className="detail__empty">{tournamentName} todavía no tiene fases.</p>
      ) : (
        <ol className="chip-list phase-trail" aria-label="Fases en el orden en que se juegan">
          {phases.map((phase) => (
            <li
              key={phase.id}
              className="chip phase-trail__item"
              style={{ '--tag': PHASE_TYPES[phase.type].tone } as CSSProperties}
              title={PHASE_TYPES[phase.type].label}
            >
              <span className="phase-trail__order">{phase.order}</span>
              {phase.name}
            </li>
          ))}
        </ol>
      )}
    </DetailSection>
  )
}
