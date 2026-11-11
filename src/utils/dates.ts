// Fechas sin hora que llegan del backend como texto "AAAA-MM-DD" (columnas DATE).

// Hoy en el mismo formato, en la hora local del navegador.
export function today(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

// Años cumplidos a hoy: "2001-04-23" -> 25.
export function ageFrom(birthDate: string): number {
  const now = today()
  const years = Number(now.slice(0, 4)) - Number(birthDate.slice(0, 4))
  // Si este año todavía no llega su mes y día, aún no cumple.
  return now.slice(5) < birthDate.slice(5) ? years - 1 : years
}

const FORMAT = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

// "1947-03-07" -> "07/03/1947", para donde hay poco espacio.
export function formatDateShort(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

// "1947-03-07" -> "7 de mar de 1947". Se arma en UTC para que la zona horaria no cambie el día.
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return FORMAT.format(new Date(Date.UTC(year, month - 1, day)))
}
