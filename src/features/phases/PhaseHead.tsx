import { Pencil, Trash2 } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { Phase } from '../../api/phases'
import { RowAction } from '../../components/ListView'
import { PanelHead } from '../../components/PageHeading'
import { PHASE_TYPES } from './phaseInfo'

interface PhaseHeadProps {
  phase: Phase
  phasesCount: number // cuántas fases tiene el torneo, para "se juega en el lugar 2 de 3"
  titleId: string
  canUpdate: boolean
  canDelete: boolean
  busy: boolean
  onEdit: () => void
  onDelete: () => void
}

// Encabezado del panel de la fase elegida: su icono, su nombre, Editar y Eliminar y, debajo, su tipo y
// su lugar en el torneo. Lo comparten la fase de grupos y la fase final.
export function PhaseHead({ phase, phasesCount, titleId, canUpdate, canDelete, busy, onEdit, onDelete }: PhaseHeadProps) {
  const info = PHASE_TYPES[phase.type]
  return (
    <>
      <PanelHead
        icon={info.icon}
        title={phase.name}
        titleId={titleId}
        action={
          (canUpdate || canDelete) && (
            <span className="row-actions">
              {canUpdate && (
                <RowAction icon={Pencil} title="Editar fase" label={`Editar ${phase.name}`} disabled={busy} onClick={onEdit} />
              )}
              {canDelete && (
                <RowAction
                  icon={Trash2}
                  tone="red"
                  title="Eliminar fase"
                  label={`Eliminar ${phase.name}`}
                  disabled={busy}
                  onClick={onDelete}
                />
              )}
            </span>
          )
        }
      />
      <p className="phase-panel__meta">
        <span className="tag" style={{ '--tag': info.tone } as CSSProperties}>
          {info.label}
        </span>
        {phasesCount === 1 ? 'Es la única fase del torneo.' : `Se juega en el lugar ${phase.order} de ${phasesCount}.`}
      </p>
    </>
  )
}
