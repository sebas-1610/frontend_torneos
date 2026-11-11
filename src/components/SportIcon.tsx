import {
  Bike,
  BowArrow,
  ChessKnight,
  Disc,
  Dumbbell,
  Feather,
  Fish,
  Footprints,
  Gamepad2,
  HandFist,
  Kayak,
  Medal,
  Mountain,
  Sailboat,
  Snowflake,
  Swords,
  Target,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { useId, type CSSProperties, type ReactNode } from 'react'
import type { SportKind } from '../features/sports/sportKind'

// Icono de cada deporte: el balón (o el objeto) que lo representa, con su color de identidad.
// Planos en la grilla de 24px de lucide: relleno de color y costuras en --tone-ink, sin brillo ni
// degradado. Los colores son los --tone-* de index.css (con variante para el tema claro).

// Los deportes sin balón conocido toman un color fijo según su id, para que no queden todos iguales.
// Deportes sin balón: un icono de lucide con su color (trazo de color y relleno suave).
const LINE_ICONS: Partial<Record<SportKind, [LucideIcon, string]>> = {
  cycling: [Bike, '--tone-teal'],
  running: [Footprints, '--tone-pink'],
  chess: [ChessKnight, '--tone-amber'],
  boxing: [HandFist, '--tone-red'],
  combat: [Swords, '--tone-purple'],
  weights: [Dumbbell, '--tone-orange'],
  archery: [BowArrow, '--tone-green'],
  shooting: [Target, '--tone-red'],
  badminton: [Feather, '--tone-teal'],
  sailing: [Sailboat, '--tone-blue'],
  rowing: [Kayak, '--tone-teal'],
  fishing: [Fish, '--tone-blue'],
  climbing: [Mountain, '--tone-brown'],
  snow: [Snowflake, '--tone-blue'],
  esports: [Gamepad2, '--tone-purple'],
  frisbee: [Disc, '--tone-pink'],
}

const GENERIC_TONES = ['--tone-teal', '--tone-pink', '--tone-blue', '--tone-amber', '--tone-red', '--tone-green']

const tone = (name: string): CSSProperties => ({ color: `var(${name})` })
const fill = (name: string) => ({ fill: `var(${name})` })
const ink = { stroke: 'var(--tone-ink)', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const

interface SportIconProps {
  kind: SportKind
  size?: number
  id?: number // solo para el color de los deportes sin balón conocido
}

export function SportIcon({ kind, size = 24, id = 0 }: SportIconProps) {
  const line = LINE_ICONS[kind]
  if (line) {
    const [Icon, color] = line
    return (
      <Icon size={size} strokeWidth={1.8} fill="currentColor" fillOpacity={0.18} style={tone(color)} aria-hidden="true" />
    )
  }
  switch (kind) {
    case 'soccer':
      return <SoccerBall size={size} color="--tone-green" />
    case 'futsal':
      return <SoccerBall size={size} color="--tone-white" />
    case 'street':
      return <SoccerBall size={size} color="--tone-amber" />
    case 'basketball':
      return (
        <Ball size={size} color="--tone-orange">
          <path d="M12 2v20M2 12h20M5.1 4.8c3.6 3.5 3.6 10.9 0 14.4M18.9 4.8c-3.6 3.5-3.6 10.9 0 14.4" {...ink} />
        </Ball>
      )
    case 'volleyball':
      return (
        <Ball size={size} color="--tone-purple">
          <path
            d="M11 7a16 16 20 0 1 10.98 4.362M12 12a13 13 0 0 1-8.66 5M16.83 13.634a16 16 0 0 1-9.267 7.328M20.66 17A13 13 0 0 0 12 12a13 13 0 0 1 0-10M8.17 15.366a16 16 0 0 1-1.713-11.69"
            {...ink}
          />
        </Ball>
      )
    case 'tennis':
      return (
        <Ball size={size} color="--tone-lime">
          <path
            d="M5.2 4.7c3.9 3.8 3.9 10.8 0 14.6M18.8 4.7c-3.9 3.8-3.9 10.8 0 14.6"
            {...ink}
            stroke="var(--tone-white)"
            strokeWidth={1.5}
          />
        </Ball>
      )
    case 'baseball':
      return (
        <Ball size={size} color="--tone-white">
          <path
            d="M5.2 4.7c3.9 3.8 3.9 10.8 0 14.6M18.8 4.7c-3.9 3.8-3.9 10.8 0 14.6"
            {...ink}
            stroke="var(--tone-red)"
            strokeWidth={1.5}
            strokeDasharray="1.4 1.1"
          />
        </Ball>
      )
    case 'rugby':
      return (
        <Svg size={size}>
          <ellipse cx="12" cy="12" rx="10.5" ry="6.4" transform="rotate(-45 12 12)" style={fill('--tone-brown')} />
          <ellipse cx="12" cy="12" rx="10.5" ry="6.4" transform="rotate(-45 12 12)" {...ink} />
          <path
            d="M9 15l6-6M9.3 13.3l1.4 1.4M10.6 12l1.4 1.4M11.9 10.7l1.4 1.4M13.2 9.4l1.4 1.4"
            {...ink}
            stroke="var(--tone-white)"
            strokeWidth={1.2}
          />
        </Svg>
      )
    case 'tableTennis':
      return (
        <Svg size={size}>
          <path d="M14.8 14.8l6 6" {...ink} stroke="var(--tone-brown)" strokeWidth={3.2} />
          <circle cx="10" cy="10" r="7.6" style={fill('--tone-red')} />
          <circle cx="10" cy="10" r="7.6" {...ink} />
          <circle cx="19.2" cy="4.8" r="2" style={fill('--tone-white')} />
          <circle cx="19.2" cy="4.8" r="2" {...ink} />
        </Svg>
      )
    case 'swimming':
      return (
        <Svg size={size}>
          <circle cx="17.3" cy="6.2" r="2.4" style={fill('--tone-blue')} />
          <path
            d="M3.5 12.8l5.2-3.6 3.6 2.6 3.9-2.4M2 17c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"
            fill="none"
            stroke="var(--tone-blue)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )
    case 'handball':
      return (
        <Ball size={size} color="--tone-blue">
          <path d="M12 1.8v20.4M3.3 6.8c5.4 3.2 12 3.2 17.4 0M3.3 17.2c5.4-3.2 12-3.2 17.4 0" {...ink} />
        </Ball>
      )
    case 'golf':
      return (
        <Ball size={size} color="--tone-white">
          {[[9, 7.5], [13.5, 6.5], [7, 11.5], [11.5, 10.8], [16, 10], [9.5, 15], [14, 14.5], [17.5, 14], [12, 18]].map(
            ([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="0.9" style={fill('--tone-ink')} opacity={0.45} />
            ),
          )}
        </Ball>
      )
    case 'bowling':
      return (
        <Ball size={size} color="--tone-red">
          <circle cx="10" cy="7.2" r="1.3" style={fill('--tone-ink')} />
          <circle cx="14.4" cy="7.6" r="1.3" style={fill('--tone-ink')} />
          <circle cx="12.6" cy="11.4" r="1.3" style={fill('--tone-ink')} />
        </Ball>
      )
    case 'billiards':
      return (
        <Ball size={size} color="--tone-amber">
          <circle cx="12" cy="12" r="5" style={fill('--tone-white')} />
          <circle cx="12" cy="10.6" r="1.5" {...ink} />
          <circle cx="12" cy="13.7" r="1.7" {...ink} />
        </Ball>
      )
    default: {
      const Icon = id % 2 === 0 ? Trophy : Medal
      return (
        <Icon
          size={size}
          strokeWidth={1.8}
          fill="currentColor"
          fillOpacity={0.18}
          style={tone(GENERIC_TONES[Math.abs(id) % GENERIC_TONES.length])}
          aria-hidden="true"
        />
      )
    }
  }
}

function Svg({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      {children}
    </svg>
  )
}

// Un balón: círculo de color con borde de tinta y lo que se dibuje encima (costuras).
function Ball({ size, color, children }: { size: number; color: string; children: ReactNode }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="10.2" style={fill(color)} />
      {children}
      <circle cx="12" cy="12" r="10.2" {...ink} />
    </Svg>
  )
}

// Pentágono de radio r centrado en (cx, cy), con un vértice hacia el ángulo rotation (grados).
function pentagon(cx: number, cy: number, r: number, rotation: number): string {
  return Array.from({ length: 5 }, (_, i) => {
    const angle = ((rotation + i * 72) * Math.PI) / 180
    return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`
  }).join(' ')
}

function polar(r: number, degrees: number): [number, number] {
  const angle = (degrees * Math.PI) / 180
  return [12 + r * Math.cos(angle), 12 + r * Math.sin(angle)]
}

// Geometría fija del balón de fútbol: pentágono central, cinco costuras que salen de sus vértices
// hacia los cinco pentágonos del borde (cortados por el círculo) y las costuras entre esos pentágonos,
// que cierran los hexágonos.
const SPOKE_ANGLES = [0, 1, 2, 3, 4].map((i) => -90 + i * 72)
const CENTER = pentagon(12, 12, 3.2, -90)
const EDGE_PATCHES = SPOKE_ANGLES.map((angle) => {
  const [x, y] = polar(11, angle)
  return pentagon(x, y, 3.2, angle + 180) // un vértice apunta al centro del balón
})
const segment = ([x1, y1]: [number, number], [x2, y2]: [number, number]) =>
  `M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`
const SEAMS = SPOKE_ANGLES.map((angle, i) => {
  const spoke = segment(polar(3.2, angle), polar(7.8, angle))
  // Del lado de este pentágono del borde al lado del siguiente.
  const [cx, cy] = polar(11, angle)
  const [nx, ny] = polar(11, SPOKE_ANGLES[(i + 1) % 5])
  const side = (x: number, y: number, deg: number): [number, number] => [
    x + 3.2 * Math.cos((deg * Math.PI) / 180),
    y + 3.2 * Math.sin((deg * Math.PI) / 180),
  ]
  // Vértice de este pentágono que mira al siguiente y vértice del siguiente que mira a este.
  const between = segment(side(cx, cy, angle + 180 - 72), side(nx, ny, angle + 72 + 180 + 72))
  return spoke + between
}).join('')

function SoccerBall({ size, color }: { size: number; color: string }) {
  const clipId = useId()
  return (
    <Svg size={size}>
      <defs>
        <clipPath id={clipId}>
          <circle cx="12" cy="12" r="10.2" />
        </clipPath>
      </defs>
      <circle cx="12" cy="12" r="10.2" style={fill(color)} />
      <g clipPath={`url(#${clipId})`}>
        {EDGE_PATCHES.map((points) => (
          <polygon key={points} points={points} style={fill('--tone-ink')} />
        ))}
        <path d={SEAMS} {...ink} />
      </g>
      <polygon points={CENTER} style={fill('--tone-ink')} />
      <circle cx="12" cy="12" r="10.2" {...ink} />
    </Svg>
  )
}
