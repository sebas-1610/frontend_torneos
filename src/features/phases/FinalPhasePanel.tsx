import { CircleCheck, GitMerge, Info, TriangleAlert, Users } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import type { Phase } from '../../api/phases'
import { DetailSection, StatTile, StatTiles } from '../../components/DetailPanel'
import { bracketsOf, feedFrom } from './phaseInfo'

interface FinalPhasePanelProps {
  phase: Phase
  previous: Phase | null // la fase que se juega antes, para ver si sus equipos llenan esta
  head: ReactNode // PhaseHead: nombre, tipo y acciones
  titleId: string
}

// Una fase final (HU-GC-05): cuántos equipos y cuántas llaves tiene, y cada llave como un partido por
// armar. Los equipos de cada llave se eligen al programar su partido.
export function FinalPhasePanel({ phase, previous, head, titleId }: FinalPhasePanelProps) {
  const teams = phase.teamsCount ?? 0
  const brackets = bracketsOf(phase)
  const feed = previous ? feedFrom(previous, phase) : null

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
          {Array.from({ length: brackets }, (_, index) => (
            <li key={index} className="bracket-slot" style={{ '--i': index } as CSSProperties}>
              <span className="bracket-slot__label">Llave {index + 1}</span>
              <span className="bracket-slot__team">Por definir</span>
              <span className="bracket-slot__versus" aria-hidden="true">
                vs
              </span>
              <span className="bracket-slot__team">Por definir</span>
            </li>
          ))}
        </ol>
      </DetailSection>

      <p className="assoc__note">
        <Info size={16} aria-hidden="true" />
        Cada llave es un solo partido: quien gana pasa a la fase siguiente. Los dos equipos de cada llave se
        eligen al programar su partido.
      </p>
    </section>
  )
}
