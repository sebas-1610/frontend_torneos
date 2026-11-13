import type { CSSProperties } from 'react'
import type { PlayerSkill } from '../../api/playerSkills'
import { MAX_LEVEL } from '../../api/playerSkills'
import { AnimatedNumber } from '../../components/AnimatedNumber'
import { categoryOf } from './categories'
import { SkillIcon } from './SkillIcon'
import './SkillRadar.css'

// Piezas para mostrar las habilidades de un jugador con su nivel (1–100): el radar, el resumen en
// barras y la media. Las usan "Asignar habilidades" (HU-GD-07) y el perfil deportivo (HU-GD-08).

const MIN_AXES = 3 // con menos no hay figura que dibujar
const MAX_AXES = 10 // con más, los nombres se montan unos sobre otros
const RADIUS = 78
const RINGS = [0.25, 0.5, 0.75, 1]

// Las que se dibujan: si son muchas, las de mayor nivel; en el radar van por nombre.
function radarSkills(skills: PlayerSkill[]): PlayerSkill[] {
  if (skills.length <= MAX_AXES) return skills
  return [...skills]
    .sort((a, b) => b.level - a.level)
    .slice(0, MAX_AXES)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

// Punto del eje número `index` de `count`, a la distancia `ratio` del centro (0 a 1). El primero va arriba.
function pointAt(index: number, count: number, ratio: number): [number, number] {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2
  return [Math.cos(angle) * RADIUS * ratio, Math.sin(angle) * RADIUS * ratio]
}

function polygon(count: number, ratioOf: (index: number) => number): string {
  return Array.from({ length: count }, (_, index) =>
    pointAt(index, count, ratioOf(index))
      .map((value) => value.toFixed(1))
      .join(','),
  ).join(' ')
}

// Un nombre largo se corta para que quepa a los lados del radar: el completo queda en el resumen de
// al lado y al pasar el mouse.
function shortName(name: string): string {
  return name.length > 13 ? `${name.slice(0, 12).trimEnd()}…` : name
}

interface SkillRadarProps {
  skills: PlayerSkill[]
  showValues?: boolean // el nivel bajo el nombre de cada eje, como en el perfil deportivo
  emptyText?: string // qué decir si no hay ejes suficientes
}

// Radar de capacidades: un eje por habilidad y, sobre cada eje, su nivel.
export function SkillRadar({ skills, showValues = false, emptyText }: SkillRadarProps) {
  if (skills.length < MIN_AXES) {
    return (
      <p className="detail__empty radar__empty">
        {emptyText ?? `El radar aparece cuando el jugador tiene al menos ${MIN_AXES} habilidades.`}
      </p>
    )
  }

  const shown = radarSkills(skills)
  const count = shown.length
  const summary = shown.map((skill) => `${skill.name} ${skill.level}`).join(', ')
  return (
    <>
      <svg
        className={`radar${showValues ? ' radar--values' : ''}`}
        // Con el nivel debajo de cada nombre hace falta una línea más arriba y abajo.
        viewBox={showValues ? '-180 -126 360 256' : '-180 -112 360 224'}
        role="img"
        aria-label={`Radar de capacidades. ${summary}.`}
      >
        {RINGS.map((ring) => (
          <polygon key={ring} className="radar__ring" points={polygon(count, () => ring)} />
        ))}
        {shown.map((skill, index) => {
          const [x, y] = pointAt(index, count, 1)
          return <line key={skill.id} className="radar__spoke" x1={0} y1={0} x2={x} y2={y} />
        })}
        <polygon className="radar__area" points={polygon(count, (index) => shown[index].level / MAX_LEVEL)} />
        {shown.map((skill, index) => {
          const [x, y] = pointAt(index, count, skill.level / MAX_LEVEL)
          const [labelX, labelY] = pointAt(index, count, 1.16)
          // El nombre se aleja del centro: a la derecha empieza en el punto y a la izquierda termina en él.
          const anchor = Math.abs(labelX) < 8 ? 'middle' : labelX > 0 ? 'start' : 'end'
          const baseline = labelY < -8 ? 'auto' : labelY > 8 ? 'hanging' : 'middle'
          // Arriba, el nombre sube para dejar el nivel junto a la punta; en lo demás, el nivel va debajo.
          const nameY = showValues && labelY < -8 ? labelY - 15 : labelY
          const valueY = labelY < -8 ? labelY : labelY + 15
          return (
            <g key={skill.id}>
              <circle className="radar__dot" cx={x} cy={y} r={3} />
              <text className="radar__label" x={labelX} y={nameY} textAnchor={anchor} dominantBaseline={baseline}>
                <title>{skill.name}</title>
                {shortName(skill.name)}
              </text>
              {showValues && (
                <text
                  className="radar__value"
                  x={labelX}
                  y={valueY}
                  textAnchor={anchor}
                  dominantBaseline={baseline}
                  aria-hidden="true"
                >
                  {skill.level}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {skills.length > MAX_AXES && (
        <p className="radar__note">El radar muestra las {MAX_AXES} habilidades de mayor nivel.</p>
      )}
    </>
  )
}

// Resumen de capacidades: cada habilidad con su icono, una barra del color de su categoría y su nivel,
// de la más alta a la más baja.
export function SkillBars({ skills }: { skills: PlayerSkill[] }) {
  const ordered = [...skills].sort((a, b) => b.level - a.level || a.name.localeCompare(b.name, 'es'))
  return (
    <ul className="skill-bars">
      {ordered.map((skill) => (
        <li key={skill.id} className="skill-bars__row">
          <SkillIcon skill={skill} size={16} />
          <span className="skill-bars__name" title={skill.name}>
            {skill.name}
          </span>
          <span
            className="skill-bars__track"
            style={{ '--tone': `var(${categoryOf(skill.category).tone})` } as CSSProperties}
            aria-hidden="true"
          >
            <span style={{ transform: `scaleX(${skill.level / MAX_LEVEL})` }} />
          </span>
          <span className="skill-bars__value num">{skill.level}</span>
        </li>
      ))}
    </ul>
  )
}

const RING_RADIUS = 34
const RING_LENGTH = Math.PI * 2 * RING_RADIUS

// Media general: el promedio de los niveles, en un anillo.
export function LevelRing({ value, label }: { value: number; label: string }) {
  return (
    <p className="level-ring">
      <span className="level-ring__figure">
        <svg viewBox="-40 -40 80 80" aria-hidden="true">
          <circle className="level-ring__track" r={RING_RADIUS} />
          <circle
            className="level-ring__fill"
            r={RING_RADIUS}
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - value / MAX_LEVEL)}
          />
        </svg>
        <AnimatedNumber value={value} className="level-ring__value" />
      </span>
      <span className="level-ring__label">{label}</span>
    </p>
  )
}
