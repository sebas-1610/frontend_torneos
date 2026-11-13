import { effectiveEnd, type ContractDates } from '../../api/teamPlayers'
import { formatDateShort } from '../../utils/dates'

// Cómo se cuenta un contrato en pantalla, a partir de sus fechas y su estado. Lo usan la plantilla de
// un equipo (HU-GD-05) y el perfil deportivo del jugador (HU-GD-08).

export interface ContractReason {
  label: string // "Finalizó contrato", "Retirado", "Cancelado"
  tone: string // color de su etiqueta (.tag)
  detail: string // una frase con el porqué
}

// Por qué terminó un contrato del historial, como en el mockup: una etiqueta y una frase.
export function contractReason(contract: ContractDates): ContractReason {
  if (contract.status === 'FINALIZADO') {
    return { label: 'Finalizó contrato', tone: 'var(--tone-amber)', detail: 'Fin del contrato acordado.' }
  }
  const retiredAt = contract.retiredAt ?? contract.endDate
  return retiredAt < contract.startDate
    ? {
        label: 'Cancelado',
        tone: 'var(--tone-purple)',
        detail: `Se retiró antes de empezar (iniciaba el ${formatDateShort(contract.startDate)}).`,
      }
    : {
        label: 'Retirado',
        tone: 'var(--tone-blue)',
        detail: `Retirado antes del fin pactado (${formatDateShort(contract.endDate)}).`,
      }
}

// "2023 – 2025", o solo "2025" si empezó y terminó el mismo año. Uno vigente: "2026 – actual".
export function contractPeriod(contract: ContractDates): string {
  const from = contract.startDate.slice(0, 4)
  if (contract.status === 'VIGENTE') return `${from} – actual`
  const to = effectiveEnd(contract).slice(0, 4)
  return from === to || to < from ? from : `${from} – ${to}`
}
