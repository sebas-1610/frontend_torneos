import { History } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import type { ProfileContract } from '../../api/playerProfiles'
import { PanelHead } from '../../components/PageHeading'
import { TeamMonogram } from '../../components/TeamMonogram'
import { formatDateShort } from '../../utils/dates'
import { contractPeriod, contractReason } from '../teams/contractInfo'

interface TeamsPanelProps {
  teams: ProfileContract[] // con los que está asociado: vigentes y por empezar
  history: ProfileContract[] // finalizados y retirados
  emptyText: string | null // el mensaje del backend si no tiene equipos asociados
}

// Panel "Equipos asociados": una línea de tiempo con sus equipos actuales y, con "Ver historial", los
// contratos que ya terminaron.
export function TeamsPanel({ teams, history, emptyText }: TeamsPanelProps) {
  const [showHistory, setShowHistory] = useState(false)
  // Como en el mockup, primero el equipo actual; luego los que están por empezar y, con el historial
  // abierto, los que ya terminaron (del más reciente al más antiguo, como llegan del backend).
  const open = [...teams].sort((a, b) => Number(b.status === 'VIGENTE') - Number(a.status === 'VIGENTE'))
  const rows = showHistory ? [...open, ...history] : open

  return (
    <section className="panel" aria-labelledby="profile-teams-title">
      <PanelHead
        icon={History}
        title="Equipos asociados"
        titleId="profile-teams-title"
        action={
          history.length > 0 && (
            <button
              type="button"
              className="button button--tint button--tint-blue profile-teams__toggle"
              aria-expanded={showHistory}
              onClick={() => setShowHistory((value) => !value)}
            >
              {showHistory ? 'Ocultar historial' : `Ver historial (${history.length})`}
            </button>
          )
        }
      />

      {teams.length === 0 && <p className="detail__empty profile-teams__empty">{emptyText}</p>}

      {rows.length > 0 && (
        <ol className="timeline">
          {rows.map((contract) => (
            <TimelineItem key={contract.id} contract={contract} />
          ))}
        </ol>
      )}
    </section>
  )
}

// Un contrato en la línea de tiempo: el escudo del equipo, su nombre, el período y una etiqueta.
function TimelineItem({ contract }: { contract: ProfileContract }) {
  const current = contract.status === 'VIGENTE'
  const tag =
    contract.status === 'VIGENTE'
      ? { label: 'Actual', tone: 'var(--tone-green)' }
      : contract.status === 'FUTURO'
        ? { label: 'Por empezar', tone: 'var(--tone-amber)' }
        : contractReason(contract)
  return (
    <li className={`timeline__item${current ? ' is-current' : ''}`}>
      <span className="timeline__dot" aria-hidden="true" />
      <TeamMonogram team={contract.team} size="md" />
      <span className="cell-lines timeline__text">
        <span className="data-table__strong">{contract.team.name}</span>
        <span className="timeline__period num">
          {contract.status === 'FUTURO' ? `Desde el ${formatDateShort(contract.startDate)}` : contractPeriod(contract)}
        </span>
      </span>
      <span className="tag" style={{ '--tag': tag.tone } as CSSProperties}>
        {tag.label}
      </span>
    </li>
  )
}
