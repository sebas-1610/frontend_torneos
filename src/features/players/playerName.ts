// Nombre completo de un jugador, como se muestra en todas las pantallas: nombres y luego apellidos.
export function fullNameOf(player: { firstName: string; lastName: string }): string {
  return `${player.firstName} ${player.lastName}`
}
