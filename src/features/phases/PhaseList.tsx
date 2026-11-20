import { ChevronDown, ChevronUp } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { Phase } from '../../api/phases'
import { RowAction } from '../../components/ListView'
import { PHASE_TYPES, phaseMeta } from './phaseInfo'

interface PhaseListProps {
  phases: Phase[] // en orden
  selectedId: number | null
  onSelect: (phaseId: number) => void
  canReorder: boolean
  busy: boolean
  onMove: (phase: Phase, step: -1 | 1) => void
}

// El camino del torneo (HU-GC-03): sus fases en el orden en que se juegan, unidas por una línea. Clic
// en una = verla a la derecha; las flechas la suben o la bajan un lugar.
export function PhaseList({ phases, selectedId, onSelect, canReorder, busy, onMove }: PhaseListProps) {
  const movable = canReorder && phases.length > 1
  return (
    <ol className="phase-path" aria-label="Fases en el orden en que se juegan">
      {phases.map((phase, index) => {
        const info = PHASE_TYPES[phase.type]
        const selected = phase.id === selectedId
        return (
          <li
            key={phase.id}
            className={`phase-step${selected ? ' is-selected' : ''}`}
            style={{ '--i': index } as CSSProperties}
          >
            <button
              type="button"
              className="phase-step__main"
              aria-current={selected ? 'true' : undefined}
              onClick={() => onSelect(phase.id)}
            >
              <span className="phase-step__order" aria-label={`Fase ${phase.order}`}>
                {phase.order}
              </span>
              <span className="phase-step__text">
                <span className="phase-step__name">{phase.name}</span>
                <span className="phase-step__meta">
                  <span className="tag" style={{ '--tag': info.tone } as CSSProperties}>
                    {info.short}
                  </span>
                  {phaseMeta(phase)}
                </span>
              </span>
            </button>
            {movable && (
              <span className="phase-step__move">
                <RowAction
                  icon={ChevronUp}
                  title="Subir un lugar"
                  label={`Subir ${phase.name}`}
                  disabled={busy || index === 0}
                  onClick={() => onMove(phase, -1)}
                />
                <RowAction
                  icon={ChevronDown}
                  title="Bajar un lugar"
                  label={`Bajar ${phase.name}`}
                  disabled={busy || index === phases.length - 1}
                  onClick={() => onMove(phase, 1)}
                />
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
