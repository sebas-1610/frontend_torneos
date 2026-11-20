import type { CSSProperties } from 'react'
import type { PhaseDevelopment } from '../../api/development'
import { PHASE_TYPES } from '../phases/phaseInfo'
import { phaseProgress } from './developmentInfo'

interface PhaseTabsProps {
  phases: PhaseDevelopment[] // en el orden en que se juegan
  currentId: number // la que se está mirando
  playingId: number | null // la que se está jugando (summary.currentPhase)
  onChoose: (phaseId: number) => void
}

// Una pestaña por fase, como en el mockup. Debajo del nombre, cuánto lleva jugado y una línea dorada que
// se llena con eso: el único dato de la barra.
export function PhaseTabs({ phases, currentId, playingId, onChoose }: PhaseTabsProps) {
  return (
    <div className="phase-tabs" role="group" aria-label="Fases del torneo">
      {phases.map((phase) => {
        const Icon = PHASE_TYPES[phase.type].icon
        const progress = phaseProgress(phase)
        const active = phase.id === currentId
        const played =
          progress === null ? 'Sin partidos' : `${phase.finished} de ${phase.finished + phase.pending} jugados`
        return (
          <button
            key={phase.id}
            type="button"
            className={`phase-tabs__tab${active ? ' is-active' : ''}`}
            aria-pressed={active}
            onClick={() => onChoose(phase.id)}
          >
            <span className="phase-tabs__name">
              <Icon size={16} aria-hidden="true" />
              <span>{phase.name}</span>
            </span>
            <span className="phase-tabs__meta">
              {phase.id === playingId ? `Fase actual · ${played}` : played}
            </span>
            <span className="phase-tabs__track" aria-hidden="true">
              <span className="phase-tabs__fill" style={{ '--fill': progress ?? 0 } as CSSProperties} />
            </span>
          </button>
        )
      })}
    </div>
  )
}
