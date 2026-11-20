import { GitMerge } from 'lucide-react'
import type { BracketSlot, PhaseDevelopment } from '../../api/development'
import { PanelHead } from '../../components/PageHeading'
import { matchWhen } from '../matches/matchInfo'
import { MatchStatusTag, Scoreline } from '../matches/MatchVisuals'

interface KnockoutBracketProps {
  phases: PhaseDevelopment[] // las fases finales, en el orden en que se juegan
  currentId: number // la que se está mirando: su columna se resalta
  selectedId: number | null // el partido del detalle
  onSelect: (matchId: number) => void
}

// "Vista eliminatoria" (HU-GC-08): una columna por fase final (Cuartos → Semifinal → Final), cada llave
// con su partido o "Por definir". Si la ronda siguiente tiene la mitad de llaves, las une una línea
// (cada par de llaves alimenta una de la siguiente).
export function KnockoutBracket({ phases, currentId, selectedId, onSelect }: KnockoutBracketProps) {
  const slotsOf = (phase: PhaseDevelopment | undefined) => phase?.bracket?.length ?? 0
  return (
    <section className="panel" aria-labelledby="bracket-title">
      <PanelHead icon={GitMerge} title="Vista eliminatoria" titleId="bracket-title" />
      <div className="bracket-scroll">
        <ol className="bracket">
          {phases.map((phase, index) => {
            const slots = phase.bracket ?? []
            const joinsNext = index < phases.length - 1 && slotsOf(phases[index + 1]) * 2 === slots.length
            const joinsPrevious = index > 0 && slotsOf(phases[index - 1]) === slots.length * 2
            const className = [
              'bracket__round',
              phase.id === currentId ? 'is-current' : '',
              joinsNext ? 'joins-next' : '',
              joinsPrevious ? 'joins-previous' : '',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <li key={phase.id} className={className}>
                <h3 className="bracket__name">{phase.name}</h3>
                <ol className="bracket__slots" aria-label={`Llaves de ${phase.name}`}>
                  {slots.map((slot) => (
                    <li key={slot.position} className="bracket__cell">
                      <BracketCard slot={slot} selected={slot.match?.id === selectedId} onSelect={onSelect} />
                    </li>
                  ))}
                </ol>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

interface BracketCardProps {
  slot: BracketSlot
  selected: boolean
  onSelect: (matchId: number) => void
}

// Una llave: su partido con el marcador corto (ganador en blanco, perdedor en gris) o, sin partido,
// "Por definir".
function BracketCard({ slot, selected, onSelect }: BracketCardProps) {
  const { match } = slot
  if (!match) {
    return (
      <div className="bracket-card is-empty">
        <span className="bracket-card__label">Llave {slot.position}</span>
        <span className="bracket-card__tbd">Por definir</span>
        <span className="bracket-card__tbd">Por definir</span>
      </div>
    )
  }
  const when = matchWhen(match.scheduledAt)
  return (
    <button
      type="button"
      className={`bracket-card${selected ? ' is-selected' : ''}`}
      aria-pressed={selected}
      onClick={() => onSelect(match.id)}
    >
      <span className="bracket-card__label">
        Llave {slot.position}
        <MatchStatusTag status={match.status} />
      </span>
      <Scoreline match={match} />
      <span className="bracket-card__when num">
        {when.date} · {when.time}
      </span>
    </button>
  )
}
