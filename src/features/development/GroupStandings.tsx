import { ListOrdered } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { GroupStandings, PhaseDevelopment } from '../../api/development'
import { PanelHead } from '../../components/PageHeading'
import { TeamMonogram } from '../../components/TeamMonogram'
import { plural } from '../../utils/plural'
import { groupMark } from '../phases/phaseInfo'
import { signed } from './developmentInfo'

// Las columnas de cifras, con lo que significa cada sigla (para el lector de pantalla y al pasar el
// mouse). Las "optional" se ocultan en el teléfono.
const FIGURES = [
  { key: 'played', short: 'PJ', title: 'Partidos jugados', optional: false },
  { key: 'won', short: 'PG', title: 'Partidos ganados', optional: true },
  { key: 'drawn', short: 'PE', title: 'Partidos empatados', optional: true },
  { key: 'lost', short: 'PP', title: 'Partidos perdidos', optional: true },
  { key: 'scoredFor', short: 'GF', title: 'Anotado a favor', optional: false },
  { key: 'scoredAgainst', short: 'GC', title: 'Anotado en contra', optional: false },
] as const

const hideClass = (optional: boolean) => (optional ? 'standings__hide' : undefined)

// "Tablas de posiciones" de una fase de grupos (HU-GC-08): una tabla por grupo. Los que hoy pasan a la
// fase siguiente llevan la marca dorada; los demás, el nombre en gris.
export function GroupStandingsPanel({ phase }: { phase: PhaseDevelopment }) {
  const groups = phase.groups ?? []
  const qualifiers = phase.qualifiersPerGroup
  return (
    <section className="panel" aria-labelledby="standings-title">
      <PanelHead
        icon={ListOrdered}
        title="Tablas de posiciones"
        titleId="standings-title"
        count={groups.length > 0 ? plural(groups.length, 'grupo', 'grupos') : null}
      />
      {groups.length === 0 ? (
        <p className="empty-state">{phase.name} todavía no tiene grupos: se crean en Fases y grupos.</p>
      ) : (
        <>
          <div className="standings-grid">
            {groups.map((group, index) => (
              <StandingsTable key={group.id} group={group} index={index} />
            ))}
          </div>
          {qualifiers !== null && (
            <p className="standings-legend">
              <span className="standings-legend__mark" aria-hidden="true" />
              {qualifiers === 1
                ? 'Pasa el primero de cada grupo a la fase siguiente.'
                : `Pasan los ${qualifiers} primeros de cada grupo a la fase siguiente.`}
            </p>
          )}
        </>
      )}
    </section>
  )
}

function StandingsTable({ group, index }: { group: GroupStandings; index: number }) {
  return (
    <article className="standings" style={{ '--i': index } as CSSProperties}>
      <h3 className="standings__head">
        <span className="standings__mark" aria-hidden="true">
          {groupMark(group.name)}
        </span>
        {group.name}
      </h3>
      {group.standings.length === 0 ? (
        <p className="detail__empty">Todavía no tiene equipos.</p>
      ) : (
        <table className="standings__table">
          <caption className="sr-only">Tabla de posiciones del {group.name}</caption>
          <thead>
            <tr>
              <th scope="col">
                <abbr title="Posición">Pos</abbr>
              </th>
              <th scope="col" className="standings__team-col">
                Equipo
              </th>
              {FIGURES.map((figure) => (
                <th key={figure.key} scope="col" className={hideClass(figure.optional)}>
                  <abbr title={figure.title}>{figure.short}</abbr>
                </th>
              ))}
              <th scope="col">
                <abbr title="Diferencia">DG</abbr>
              </th>
              <th scope="col">
                <abbr title="Puntos">PTS</abbr>
              </th>
            </tr>
          </thead>
          <tbody>
            {group.standings.map((row) => (
              <tr key={row.team.id} className={row.qualifies ? 'is-qualified' : 'is-out'}>
                <td className="standings__pos">
                  {row.position}
                  {row.qualifies && <span className="sr-only"> (clasifica)</span>}
                </td>
                <th scope="row" className="standings__team">
                  <TeamMonogram team={row.team} size="sm" />
                  <span className="standings__name" title={row.team.name}>
                    {row.team.name}
                  </span>
                </th>
                {FIGURES.map((figure) => (
                  <td key={figure.key} className={hideClass(figure.optional)}>
                    {row[figure.key]}
                  </td>
                ))}
                <td>{signed(row.difference)}</td>
                <td className="standings__points">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </article>
  )
}
