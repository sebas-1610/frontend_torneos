import { normalize } from '../roles/labels'

// La posición de un jugador es texto libre (cambia de un deporte a otro). De ese texto salen dos
// cosas para mostrarla como en el mockup: una sigla corta ("Delantero" → "DEL") y un color según la
// línea en la que juega.

// Palabra (sin tildes) → sigla. Se revisan en orden.
const CODES: [string, string][] = [
  ['portero', 'POR'],
  ['arquero', 'POR'],
  ['guardameta', 'POR'],
  ['defensa', 'DEF'],
  ['central', 'DFC'],
  ['lateral', 'LAT'],
  ['libero', 'LIB'],
  ['mediocampista', 'MC'],
  ['medio', 'MC'],
  ['volante', 'VOL'],
  ['extremo', 'EXT'],
  ['delantero', 'DEL'],
  ['atacante', 'DEL'],
  ['base', 'BAS'],
  ['escolta', 'ESC'],
  ['alero', 'ALE'],
  ['pivot', 'PIV'],
]

// Color de cada línea. La primera palabra que aparezca en la posición (o su sigla) decide.
const TONES: [string, string[]][] = [
  ['purple', ['portero', 'arquero', 'guardameta', 'por']],
  ['blue', ['defensa', 'central', 'lateral', 'libero', 'zaguero', 'def', 'dfc', 'lat', 'lib']],
  ['amber', ['medio', 'volante', 'base', 'armador', 'escolta', 'mc', 'vol', 'bas', 'esc']],
  ['red', ['delantero', 'atacante', 'extremo', 'punta', 'alero', 'pivot', 'del', 'ext', 'ale', 'piv']],
]

// "Delantero" → "DEL". Una posición desconocida usa sus tres primeras letras; una que ya es corta
// ("MC") queda igual.
export function positionCode(position: string): string {
  const text = normalize(position.trim())
  if (text.length <= 3) return text.toUpperCase()
  const known = CODES.find(([word]) => text.includes(word))
  return known ? known[1] : text.replace(/[^a-z0-9]/g, '').slice(0, 3).toUpperCase()
}

// Color de la posición, como variable CSS: var(--tone-red) para un delantero.
export function positionColor(position: string): string {
  const text = normalize(position.trim())
  const words = text.split(/[^a-z0-9]+/)
  const tone = TONES.find(([, keys]) => keys.some((key) => (key.length <= 3 ? words.includes(key) : text.includes(key))))
  return `var(--tone-${tone ? tone[0] : 'teal'})`
}
