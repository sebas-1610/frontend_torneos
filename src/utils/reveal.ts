// En pantallas angostas el detalle queda debajo de la lista: "Ver" baja hasta él.
// Lo usan Equipos y Jugadores, que apilan el detalle por debajo de 1366px (Vivid.css).
const STACKED = '(max-width: 1365px)'

export function revealIfStacked(getElement: () => HTMLElement | null) {
  if (!window.matchMedia(STACKED).matches) return
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // Después de pintar el detalle nuevo.
  requestAnimationFrame(() => getElement()?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' }))
}
