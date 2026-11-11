import type { Sport } from '../../api/sports'
import { normalize } from '../roles/labels'

// Qué balón (o qué objeto) representa a cada deporte: lo dibuja components/SportIcon.tsx.

export type SportKind =
  | 'soccer'
  | 'futsal'
  | 'street'
  | 'basketball'
  | 'volleyball'
  | 'tennis'
  | 'tableTennis'
  | 'baseball'
  | 'rugby'
  | 'swimming'
  | 'cycling'
  | 'running'
  | 'handball'
  | 'golf'
  | 'bowling'
  | 'billiards'
  | 'chess'
  | 'boxing'
  | 'combat'
  | 'weights'
  | 'archery'
  | 'shooting'
  | 'badminton'
  | 'sailing'
  | 'rowing'
  | 'fishing'
  | 'climbing'
  | 'snow'
  | 'esports'
  | 'frisbee'
  | 'generic'

// El deporte se guarda como texto libre: se reconoce por palabras de su nombre, sin tildes ni
// mayúsculas. Para reconocer un deporte nuevo con un balón que ya existe, basta agregar la palabra
// aquí; un balón nuevo se dibuja en SportIcon.tsx.
// Gana la primera lista que coincide, así que lo específico va antes ("tenis de mesa" antes que
// "tenis") y las variantes del fútbol van al final, justo antes de "fútbol": sus palabras ("salón",
// "playa", "americano") también aparecen en otros deportes ("Vóley playa", "Baloncesto de salón").
const KEYWORDS: [string[], SportKind][] = [
  [['baloncesto', 'basquet', 'basket'], 'basketball'],
  [['voleibol', 'voley', 'volley', 'balonvolea'], 'volleyball'],
  [['tenis de mesa', 'ping pong', 'pingpong'], 'tableTennis'],
  [['tenis', 'padel', 'squash'], 'tennis'],
  [['beisbol', 'softbol', 'baseball', 'softball'], 'baseball'],
  [['natacion', 'nado', 'waterpolo', 'clavados'], 'swimming'],
  [['ciclismo', 'bicicleta', 'bmx'], 'cycling'],
  [['atletismo', 'carrera', 'maraton', 'running', 'trote'], 'running'],
  [['balonmano', 'handball'], 'handball'],
  [['golf', 'minigolf'], 'golf'],
  [['bolos', 'boliche', 'bowling'], 'bowling'],
  [['billar', 'pool', 'snooker'], 'billiards'],
  [['ajedrez', 'chess'], 'chess'],
  [['boxeo', 'boxing', 'kickboxing'], 'boxing'],
  [['karate', 'taekwondo', 'judo', 'lucha', 'esgrima', 'artes marciales', 'jiu'], 'combat'],
  [['halterofilia', 'pesas', 'gimnasio', 'crossfit', 'fisicoculturismo'], 'weights'],
  [['tiro con arco', 'arqueria'], 'archery'],
  [['tiro', 'dardos'], 'shooting'],
  [['badminton'], 'badminton'],
  [['vela', 'velero', 'regata'], 'sailing'],
  [['remo', 'canotaje', 'kayak', 'piraguismo'], 'rowing'],
  [['pesca'], 'fishing'],
  [['escalada', 'montanismo', 'senderismo'], 'climbing'],
  [['esqui', 'snowboard', 'patinaje sobre hielo'], 'snow'],
  [['esports', 'e sports', 'videojuegos', 'gaming'], 'esports'],
  [['ultimate', 'frisbee', 'disco'], 'frisbee'],
  [['americano', 'rugby', 'tocho'], 'rugby'],
  [['salon', 'futsal', 'sala', 'microfutbol'], 'futsal'],
  [['callejero', 'playa', 'banquitas'], 'street'],
  [['futbol', 'soccer'], 'soccer'],
]

// Una palabra coincide si está al inicio de una palabra del nombre: "basket" reconoce "Basketball 3x3"
// y "futsal", "Futsal femenino".
export function sportKindOf(name: string): SportKind {
  const text = ` ${normalize(name).replace(/[^a-z0-9]+/g, ' ')} `
  return KEYWORDS.find(([words]) => words.some((word) => text.includes(` ${word}`)))?.[1] ?? 'generic'
}

// Un subdeporte sin palabra conocida usa el balón de su padre ("Copa Arcanos", subdeporte de Fútbol,
// se ve con el balón de fútbol).
export function resolveSportKind(sport: Sport, sports: Sport[]): SportKind {
  const byId = new Map(sports.map((item) => [item.id, item]))
  let current: Sport | undefined = sport
  for (let depth = 0; current && depth < 20; depth++) {
    const kind = sportKindOf(current.name)
    if (kind !== 'generic') return kind
    current = current.parent ? byId.get(current.parent.id) : undefined
  }
  return 'generic'
}
