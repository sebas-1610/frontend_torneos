import type { BetMatch } from '../../api/bets'
import { TeamMonogram } from '../../components/TeamMonogram'
import { matchTitle, matchWhen } from '../matches/matchInfo'

// El partido de una apuesta en una línea: los dos escudos, "Local vs Visitante" y, debajo, el torneo
// y cuándo se juega. Sirve con un partido completo o con el resumen que trae cada apuesta.
export function BetMatchLine({ match }: { match: BetMatch }) {
  const when = matchWhen(match.scheduledAt)
  return (
    <span className="bet-match">
      <span className="bet-match__crests" aria-hidden="true">
        <TeamMonogram team={match.homeTeam} size="sm" />
        <TeamMonogram team={match.awayTeam} size="sm" />
      </span>
      <span className="bet-match__text">
        <span className="bet-match__title">{matchTitle(match)}</span>
        <span className="bet-match__detail num">
          {match.tournament.name} · {when.date} · {when.time}
        </span>
      </span>
    </span>
  )
}
