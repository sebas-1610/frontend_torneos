import { CalendarDays, Swords } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { DevelopmentMatch, PhaseDevelopment } from '../../api/development'
import { PanelHead } from '../../components/PageHeading'
import { plural } from '../../utils/plural'
import { matchSlot, matchWhen } from '../matches/matchInfo'
import { MatchStatusTag, MatchVersus } from '../matches/MatchVisuals'
import { shortNameOf } from '../players/playerName'

interface PhaseMatchesProps {
  phase: PhaseDevelopment
  selectedId: number | null // el partido del detalle
  onSelect: (matchId: number) => void
}

// Anotaciones que caben en una tarjeta; el resto se cuenta ("y 2 anotaciones más") y se ve en el detalle.
const MAX_SCORES = 2

// "Partidos de la fase" (HU-GC-08): una tarjeta por partido, por fecha. Al elegir una, su detalle sale
// en el panel "Detalle del partido".
export function PhaseMatches({ phase, selectedId, onSelect }: PhaseMatchesProps) {
  const { matches } = phase
  return (
    <section className="panel" aria-labelledby="phase-matches-title">
      <PanelHead
        icon={Swords}
        title="Partidos de la fase"
        titleId="phase-matches-title"
        count={matches.length > 0 ? plural(matches.length, 'partido', 'partidos') : null}
      />
      {matches.length === 0 ? (
        <p className="empty-state">{phase.name} todavía no tiene partidos: se programan en Partidos.</p>
      ) : (
        <ul className="match-cards">
          {matches.map((match, index) => (
            <li key={match.id} style={{ '--i': index } as CSSProperties}>
              <MatchCard match={match} selected={match.id === selectedId} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

interface MatchCardProps {
  match: DevelopmentMatch
  selected: boolean
  onSelect: (matchId: number) => void
}

// Como las tarjetas del mockup: grupo y jornada con el estado arriba, los dos escudos frente a frente y,
// abajo, quién anotó o, si todavía no hay anotaciones, cuándo se juega.
function MatchCard({ match, selected, onSelect }: MatchCardProps) {
  const when = matchWhen(match.scheduledAt)
  const more = match.scores.length - MAX_SCORES
  return (
    <button
      type="button"
      className={`match-card${selected ? ' is-selected' : ''}${match.status === 'CANCELADO' ? ' is-cancelled' : ''}`}
      aria-pressed={selected}
      onClick={() => onSelect(match.id)}
    >
      <span className="match-card__head">
        <span className="match-card__slot">{matchSlot(match) || match.phase.name}</span>
        <MatchStatusTag status={match.status} />
      </span>
      <MatchVersus match={match} />
      {match.scores.length > 0 ? (
        <span className="match-card__scores">
          {match.scores.slice(0, MAX_SCORES).map((score) => (
            <span key={score.id} className="match-card__score">
              <span className="match-card__minute">{score.minute}'</span>
              {shortNameOf(score.player)}
            </span>
          ))}
          {more > 0 && <span className="match-card__more">y {plural(more, 'anotación', 'anotaciones')} más</span>}
        </span>
      ) : (
        <span className="match-card__when num">
          <CalendarDays size={14} aria-hidden="true" />
          {when.date} · {when.time}
        </span>
      )}
    </button>
  )
}
