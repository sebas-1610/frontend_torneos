// "$ 18.000" o "$ 18.000,50": pesos colombianos, con centavos solo si los hay (un pago es valor × cuota).
const PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function formatMoney(value: number): string {
  return PESOS.format(value)
}

// "1,85": una cuota con sus dos decimales.
export function formatOdds(value: number): string {
  return value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
