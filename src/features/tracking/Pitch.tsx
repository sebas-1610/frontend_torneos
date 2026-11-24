import { useId, type CSSProperties } from 'react'
import type { LastPosition, TrackedPlayer } from '../../api/tracking'
import { SportIcon } from '../../components/SportIcon'
import type { SportKind } from '../sports/sportKind'
import { fullName, initialsOf, type FieldKind } from './trackingInfo'

// La cancha de la pizarra (HU-GC-09, criterio 2) en SVG propio, sin librerías: las líneas del deporte y
// encima los jugadores y la pelota. Todo se dibuja en metros; las posiciones llegan de 0 a 100 (porcentaje
// del largo y del ancho) y se pasan a metros, así la misma posición sirve en cualquier cancha. x = 0 es el
// arco del local. Cada ficha se mueve con una transición de CSS (se apaga con prefers-reduced-motion). Si el
// jugador tiene foto, va recortada en círculo con un aro del color de su equipo; si no, sus iniciales.

interface FieldSize {
  length: number // metros, a lo largo (eje x)
  width: number // metros, a lo ancho (eje y)
  label: string
}

const FIELDS: Record<FieldKind, FieldSize> = {
  soccer: { length: 105, width: 68, label: 'Cancha de fútbol' },
  futsal: { length: 40, width: 20, label: 'Cancha de fútbol de salón' },
  basketball: { length: 28, width: 15, label: 'Cancha de baloncesto' },
  volleyball: { length: 18, width: 9, label: 'Cancha de voleibol' },
  generic: { length: 100, width: 64, label: 'Campo de juego' },
}

// Radio de cada ficha según la cancha (fracción del largo). Las canchas chicas tienen menos jugadores y
// aguantan fichas más grandes.
const TOKEN_SCALE: Record<FieldKind, number> = {
  soccer: 0.026,
  futsal: 0.032,
  basketball: 0.034,
  volleyball: 0.034,
  generic: 0.026,
}

type Side = 'home' | 'away'

interface PitchProps {
  kind: FieldKind
  home: TrackedPlayer[] // solo los que tienen posición
  away: TrackedPlayer[]
  ball: LastPosition | null
  moveMs?: number // cuánto tarda cada ficha en llegar a su nueva posición (el recorrido la ajusta a su velocidad)
  photos?: ReadonlyMap<number, string> // id del jugador → foto ("data:image/..."); sin foto, las iniciales
  ballKind?: SportKind // el balón del deporte (el mismo dibujo de Deportes); sin él, uno genérico
  sportId?: number // solo para el color del balón genérico
}

export function Pitch({ kind, home, away, ball, moveMs = 900, photos, ballKind = 'generic', sportId = 0 }: PitchProps) {
  const { length, width, label } = FIELDS[kind]
  const radius = length * TOKEN_SCALE[kind]
  const ballRadius = radius * 0.62 // el balón, un poco más chico que una ficha
  const margin = Math.max(length * 0.03, radius * 1.3) // aire para los arcos y las fichas que pisan la línea
  // Un id por cancha para el recorte circular de las fotos (useId trae caracteres que no sirven en url(#…)).
  const clipId = `pitch-photo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const toX = (x: number) => (x / 100) * length
  const toY = (y: number) => (y / 100) * width

  const token = (player: TrackedPlayer, side: Side) => {
    const at = player.lastPosition!
    const role = side === 'home' ? 'local' : 'visitante'
    const photo = photos?.get(player.id) ?? null
    return (
      <g
        key={player.id}
        className={`pitch__token pitch__token--${side}`}
        style={{ transform: `translate(${toX(at.x)}px, ${toY(at.y)}px)` }}
      >
        <title>{`${fullName(player)} (${role}${player.position ? `, ${player.position}` : ''})`}</title>
        <circle className="pitch__disc" r={radius} />
        {photo ? (
          <image
            href={photo}
            x={-radius}
            y={-radius}
            width={radius * 2}
            height={radius * 2}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
          />
        ) : (
          <text dy="0.35em" fontSize={radius * 0.9}>
            {initialsOf(player)}
          </text>
        )}
        {/* Con foto, el aro del color del equipo sigue diciendo de qué equipo es (criterio 5). */}
        {photo && <circle className="pitch__ring" r={radius} />}
      </g>
    )
  }

  const summary = `${label}: ${home.length} del local y ${away.length} del visitante en la cancha${ball ? ', y la pelota' : ''}.`

  return (
    <svg
      className="pitch"
      viewBox={`${-margin} ${-margin} ${length + margin * 2} ${width + margin * 2}`}
      role="img"
      aria-label={summary}
      style={{ '--move': `${moveMs}ms` } as CSSProperties}
    >
      <defs>
        <clipPath id={clipId} clipPathUnits="objectBoundingBox">
          <circle cx="0.5" cy="0.5" r="0.5" />
        </clipPath>
      </defs>
      <rect className="pitch__ground" x={-margin} y={-margin} width={length + margin * 2} height={width + margin * 2} />
      <g className="pitch__lines">
        <rect x={0} y={0} width={length} height={width} />
        <FieldMarkings kind={kind} length={length} width={width} />
      </g>
      {home.map((player) => token(player, 'home'))}
      {away.map((player) => token(player, 'away'))}
      {ball && (
        <g className="pitch__ball" style={{ transform: `translate(${toX(ball.x)}px, ${toY(ball.y)}px)` }}>
          <title>Pelota</title>
          {/* El balón del deporte (SportIcon), centrado en su posición. */}
          <g transform={`translate(${-ballRadius} ${-ballRadius})`}>
            <SportIcon kind={ballKind} id={sportId} size={ballRadius * 2} />
          </g>
        </g>
      )}
    </svg>
  )
}

// Las líneas de cada deporte, con sus medidas reglamentarias en metros.
function FieldMarkings({ kind, length, width }: { kind: FieldKind; length: number; width: number }) {
  const midX = length / 2
  const midY = width / 2
  const halfway = <line x1={midX} y1={0} x2={midX} y2={width} />

  switch (kind) {
    case 'soccer': {
      const area = (x: number, depth: number, span: number) => (
        <rect x={x} y={midY - span / 2} width={depth} height={span} />
      )
      // El arco del área: la parte del círculo del punto penal (9,15 m) que queda fuera del área.
      const arcY = Math.sqrt(9.15 ** 2 - 5.5 ** 2)
      return (
        <>
          {halfway}
          <circle cx={midX} cy={midY} r={9.15} />
          <circle className="pitch__spot" cx={midX} cy={midY} r={0.35} />
          {area(0, 16.5, 40.32)}
          {area(length - 16.5, 16.5, 40.32)}
          {area(0, 5.5, 18.32)}
          {area(length - 5.5, 5.5, 18.32)}
          <circle className="pitch__spot" cx={11} cy={midY} r={0.35} />
          <circle className="pitch__spot" cx={length - 11} cy={midY} r={0.35} />
          <path d={`M16.5 ${midY - arcY} A9.15 9.15 0 0 1 16.5 ${midY + arcY}`} />
          <path d={`M${length - 16.5} ${midY - arcY} A9.15 9.15 0 0 0 ${length - 16.5} ${midY + arcY}`} />
          <rect x={-1.5} y={midY - 3.66} width={1.5} height={7.32} />
          <rect x={length} y={midY - 3.66} width={1.5} height={7.32} />
        </>
      )
    }
    case 'futsal': {
      // El área: dos cuartos de círculo de 6 m desde cada palo, unidos por una recta.
      const post = 1.5
      return (
        <>
          {halfway}
          <circle cx={midX} cy={midY} r={3} />
          <circle className="pitch__spot" cx={midX} cy={midY} r={0.15} />
          <path d={`M0 ${midY - post - 6} A6 6 0 0 1 6 ${midY - post} L6 ${midY + post} A6 6 0 0 1 0 ${midY + post + 6}`} />
          <path
            d={`M${length} ${midY - post - 6} A6 6 0 0 0 ${length - 6} ${midY - post} L${length - 6} ${midY + post} A6 6 0 0 0 ${length} ${midY + post + 6}`}
          />
          <circle className="pitch__spot" cx={6} cy={midY} r={0.15} />
          <circle className="pitch__spot" cx={length - 6} cy={midY} r={0.15} />
          <rect x={-1} y={midY - post} width={1} height={post * 2} />
          <rect x={length} y={midY - post} width={1} height={post * 2} />
        </>
      )
    }
    case 'basketball': {
      const hoop = 1.575 // del aro a la línea de fondo
      const corner = 0.9 // la línea de tres en las esquinas, separada de la banda
      const arcX = hoop + Math.sqrt(6.75 ** 2 - (midY - corner) ** 2)
      const end = (mirror: boolean) => {
        const x = (value: number) => (mirror ? length - value : value)
        return (
          <>
            <rect x={mirror ? length - 5.8 : 0} y={midY - 2.45} width={5.8} height={4.9} />
            <circle cx={x(5.8)} cy={midY} r={1.8} />
            <line x1={x(1.2)} y1={midY - 0.9} x2={x(1.2)} y2={midY + 0.9} />
            <circle cx={x(hoop)} cy={midY} r={0.23} />
            <path
              d={`M${x(0)} ${corner} L${x(arcX)} ${corner} A6.75 6.75 0 0 ${mirror ? 0 : 1} ${x(arcX)} ${width - corner} L${x(0)} ${width - corner}`}
            />
          </>
        )
      }
      return (
        <>
          {halfway}
          <circle cx={midX} cy={midY} r={1.8} />
          {end(false)}
          {end(true)}
        </>
      )
    }
    case 'volleyball':
      return (
        <>
          <line className="pitch__net" x1={midX} y1={-0.6} x2={midX} y2={width + 0.6} />
          <line x1={midX - 3} y1={0} x2={midX - 3} y2={width} />
          <line x1={midX + 3} y1={0} x2={midX + 3} y2={width} />
        </>
      )
    case 'generic':
      return (
        <>
          {halfway}
          <circle cx={midX} cy={midY} r={width * 0.14} />
          <circle className="pitch__spot" cx={midX} cy={midY} r={0.5} />
        </>
      )
  }
}
