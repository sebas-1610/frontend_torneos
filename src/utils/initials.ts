// Iniciales para avatares y tiras de confirmación: "Ana Pérez" -> "AP".
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}
