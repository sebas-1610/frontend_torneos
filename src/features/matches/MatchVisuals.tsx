import { CalendarDays, MapPin } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { Match, MatchStatus } from '../../api/matches'
import type { TeamSummary } from '../../api/teams'
import { TeamMonogram } from '../../components/TeamMonogram'
import { venueName } from '../venues/venueInfo'
import { MATCH_STATUSES, matchPlace, matchWhen, shownScore, winnerSide } from './matchInfo'
import './Matches.css'

// Cómo se ve un partido en la tabla, en el detalle y en las llaves de una fase final.

// El estado con su color; "En juego" lleva un punto, como un "en vivo".
export function MatchStatusTag({ status }: { status: MatchStatus }) {
  const { label, tone } = MATCH_STATUSES[status]
  return (
    <span className="tag match-tag" style={{ '--tag': tone } as CSSProperties}>
      {status === 'EN_JUEGO' && <span className="live-dot" aria-hidden="true" />}
      {label}
    </span>
  )
}

type Side = 'home' | 'away'

// Los dos equipos uno debajo del otro, cada uno con su marcador a la derecha: la forma corta, para las
// llaves de una fase final. El ganador en blanco; el perdedor, en gris. En juego, el marcador va en dorado.
export function Scoreline({ match }: { match: Match }) {
  const score = shownScore(match)
  const winner = winnerSide(match.result)
  const penalties = match.result?.homePenalties !== null && match.result?.homePenalties !== undefined

  const row = (team: TeamSummary, side: Side) => {
    const goals = score ? score[side] : null
    const pens = side === 'home' ? match.result?.homePenalties : match.result?.awayPenalties
    return (
      <span className={`scoreline__row${winner === null ? '' : winner === side ? ' is-winner' : ' is-loser'}`}>
        <TeamMonogram team={team} size="sm" />
        <span className="scoreline__name">{team.name}</span>
        {penalties && <span className="scoreline__pens">({pens})</span>}
        <span className={`scoreline__goals${score?.live ? ' is-live' : ''}`}>{goals ?? ''}</span>
      </span>
    )
  }

  return (
    <span className="scoreline">
      {row(match.homeTeam, 'home')}
      {row(match.awayTeam, 'away')}
    </span>
  )
}

// Los dos equipos frente a frente, como las tarjetas de partidos del mockup: escudo, "VS" (o el
// marcador, si ya lo hay) y escudo, con cada nombre debajo de su escudo. El ganador en blanco; el
// perdedor, en gris; en juego, el marcador en vivo va en dorado. "row" va en la tabla de Partidos;
// "board", más grande y con "Local" / "Visitante", en el marcador del detalle.
export function MatchVersus({ match, size = 'row' }: { match: Match; size?: 'row' | 'board' }) {
  const score = shownScore(match)
  const winner = winnerSide(match.result)
  const { result } = match
  const penalties = result !== null && result.homePenalties !== null && result.awayPenalties !== null
  const board = size === 'board'

  const side = (team: TeamSummary, which: Side, role: string) => (
    <span className={`versus__team${winner === null ? '' : winner === which ? ' is-winner' : ' is-loser'}`}>
      <TeamMonogram team={team} size={board ? 'lg' : 'md'} />
      <span className="versus__name" title={team.name}>
        {team.name}
      </span>
      {board && <span className="versus__role">{role}</span>}
    </span>
  )

  return (
    <span className={`versus versus--${size}`}>
      {side(match.homeTeam, 'home', 'Local')}
      <span className="versus__middle">
        {score ? (
          <span className={`versus__score${score.live ? ' is-live' : ''}`}>
            <span>{score.home}</span>
            <span className="versus__dash">–</span>
            <span>{score.away}</span>
            {score.live && <span className="sr-only">, en vivo</span>}
          </span>
        ) : (
          <span className="versus__vs">VS</span>
        )}
        {penalties && (
          <span className="versus__pens">
            {/* La raya permite partir la línea después de ella: el marcador va junto, sin partirse. */}
            Penales{' '}
            <span className="versus__pens-score">
              {result.homePenalties} – {result.awayPenalties}
            </span>
          </span>
        )}
      </span>
      {side(match.awayTeam, 'away', 'Visitante')}
    </span>
  )
}

interface ScoreboardProps {
  match: Match
  venueHref?: string | null // el detalle del escenario en Escenarios, si la sesión puede abrirlo
}

// El marcador grande del detalle: su estado, dónde se juega en el torneo, los dos equipos frente a
// frente, cuándo y en qué escenario.
export function Scoreboard({ match, venueHref = null }: ScoreboardProps) {
  const score = shownScore(match)
  const when = matchWhen(match.scheduledAt)
  const result = match.result
  // Si hay anotaciones y el resultado oficial no coincide con lo que suman, se dice.
  const scoresDiffer =
    result !== null &&
    match.liveScore.home + match.liveScore.away > 0 &&
    (result.homeScore !== match.liveScore.home || result.awayScore !== match.liveScore.away)

  return (
    <div className="scoreboard">
      <div className="scoreboard__top">
        <MatchStatusTag status={match.status} />
        <span className="scoreboard__place">{matchPlace(match)}</span>
      </div>
      <MatchVersus match={match} size="board" />
      {score?.live && (
        <p className="scoreboard__note is-live">
          <span className="live-dot" aria-hidden="true" />
          En vivo: lo que suman las anotaciones
        </p>
      )}
      {scoresDiffer && (
        <p className="scoreboard__note">
          Las anotaciones registradas suman {match.liveScore.home} – {match.liveScore.away}.
        </p>
      )}
      <p className="scoreboard__when">
        <span className="scoreboard__fact">
          <CalendarDays size={14} aria-hidden="true" />
          {when.date} · {when.time}
        </span>
        <span className="scoreboard__fact">
          <MapPin size={14} aria-hidden="true" />
          {match.venue === null ? (
            'Sin escenario'
          ) : venueHref ? (
            <a className="scoreboard__link" href={venueHref} title={`${match.venue.address}, ${match.venue.city}`}>
              {venueName(match.venue)}
            </a>
          ) : (
            <span title={`${match.venue.address}, ${match.venue.city}`}>{venueName(match.venue)}</span>
          )}
        </span>
      </p>
    </div>
  )
}
