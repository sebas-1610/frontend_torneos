// "1 equipo" / "3 equipos": la cifra con la palabra en singular o en plural.
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}
