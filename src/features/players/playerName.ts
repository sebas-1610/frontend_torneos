// Nombre completo de un jugador, como se muestra en todas las pantallas: nombres y luego apellidos.
export function fullNameOf(player: { firstName: string; lastName: string }): string {
  return `${player.firstName} ${player.lastName}`
}

// En corto, donde no cabe el nombre completo (las tarjetas de partidos): "J. Pérez".
export function shortNameOf(player: { firstName: string; lastName: string }): string {
  return `${player.firstName.trim().charAt(0)}. ${player.lastName}`
}
