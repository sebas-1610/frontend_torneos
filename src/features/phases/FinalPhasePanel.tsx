import { CircleCheck, GitMerge, Info, TriangleAlert, Users } from 'lucide-react'
import { useCallback, type CSSProperties, type ReactNode } from 'react'
import { findMatchesByPhase } from '../../api/matches'
import type { Phase } from '../../api/phases'
import { DetailSection, StatTile, StatTiles } from '../../components/DetailPanel'
import { useLoadList } from '../../hooks/useLoadList'
import { matchWhen } from '../matches/matchInfo'
import { MatchStatusTag, Scoreline } from '../matches/MatchVisuals'
import { bracketsOf, feedFrom } from './phaseInfo'

interface FinalPhasePanelProps {
  phase: Phase
  previous: Phase | null // la fase que se juega antes, para ver si sus equipos llenan esta
  head: ReactNode // PhaseHead: nombre, tipo y acciones
  titleId: string
  canListMatches: boolean // para llenar cada llave con su partido
}

// Una fase final (HU-GC-05): cuántos equipos y cuántas llaves tiene, y cada llave con su partido
// (equipos, marcador y estado) o "Por definir" si todavía no se programa.
export function FinalPhasePanel({ phase, previous, head, titleId, canListMatches }: FinalPhasePanelProps) {
  const teams = phase.teamsCount ?? 0
  const brackets = bracketsOf(phase)
  const feed = previous ? feedFrom(previous, phase) : null
  const fetchMatches = useCallback(() => findMatchesByPhase(phase.id), [phase.id])
  const { items: matches } = useLoadList(fetchMatches, canListMatches)

  return (
    <section className="panel phase-panel" aria-labelledby={titleId}>
      {head}

      <StatTiles>
        <StatTile icon={Users} tone="--tone-blue" value={teams} label={teams === 1 ? 'Equipo' : 'Equipos'} />
        <StatTile icon={GitMerge} tone="--tone-amber" value={brackets} label={brackets === 1 ? 'Llave' : 'Llaves'} />
      </StatTiles>

      {feed && (
        <p className={`phase-feed${feed.fits ? ' is-ok' : ''}`}>
          {feed.fits ? <CircleCheck size={16} aria-hidden="true" /> : <TriangleAlert size={16} aria-hidden="true" />}
          {feed.text}
        </p>
      )}

      <DetailSection title="Llaves">
        <ol className="bracket-slots" aria-label={`Llaves de ${phase.name}`}>
          {Array.from({ length: brackets }, (_, index) => {
            const slot = index + 1
            const match = matches.find((item) => item.bracketPosition === slot)
            return (
              <li
                key={slot}
                className={`bracket-slot${match ? ' is-set' : ''}`}
                style={{ '--i': index } as CSSProperties}
              >
                <span className="bracket-slot__label">
                  Llave {slot}
                  {match && <MatchStatusTag status={match.status} />}
                </span>
                {match ? (
                  <>
                    <Scoreline match={match} />
                    <span className="bracket-slot__when">
                      {matchWhen(match.scheduledAt).date} · {matchWhen(match.scheduledAt).time}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="bracket-slot__team">Por definir</span>
                    <span className="bracket-slot__versus" aria-hidden="true">
                      vs
                    </span>
                    <span className="bracket-slot__team">Por definir</span>
                  </>
                )}
              </li>
            )
          })}
        </ol>
      </DetailSection>

      <p className="assoc__note">
        <Info size={16} aria-hidden="true" />
        Cada llave es un solo partido: quien gana pasa a la fase siguiente. Los dos equipos de cada llave se
        eligen al programar su partido en Partidos.
      </p>
    </section>
  )
}
