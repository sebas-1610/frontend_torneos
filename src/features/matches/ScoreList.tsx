import type { ReactNode } from 'react'
import type { Match } from '../../api/matches'
import type { Score } from '../../api/scores'
import { TeamMonogram } from '../../components/TeamMonogram'
import { fullNameOf } from '../players/playerName'
import { matchTitle } from './matchInfo'

interface ScoreListProps {
  match: Pick<Match, 'homeTeam' | 'awayTeam'>
  scores: Score[] // por minuto
  actions?: (score: Score) => ReactNode // los botones de cada una (Partidos); sin ellos, solo se leen
}

// Las anotaciones de un partido: el minuto en dorado, el escudo, quién anotó, su equipo y cuánto sumó.
// La usan el detalle de Partidos (con editar y eliminar) y Desarrollo del torneo (solo lectura).
export function ScoreList({ match, scores, actions }: ScoreListProps) {
  return (
    <ul className="score-list" aria-label={`Anotaciones de ${matchTitle(match)}`}>
      {scores.map((score) => (
        <li key={score.id} className={`score-row${score.team.id === match.awayTeam.id ? ' is-away' : ''}`}>
          <span className="score-row__minute">{score.minute}'</span>
          <TeamMonogram team={score.team} size="sm" />
          <span className="score-row__text">
            <span className="score-row__player">{fullNameOf(score.player)}</span>
            <span className="score-row__team">{score.team.name}</span>
          </span>
          <span className="score-row__points">+{score.points}</span>
          {actions?.(score)}
        </li>
      ))}
    </ul>
  )
}
