// La pasarela de prueba del backend (SimulatedPaymentGateway, PAYMENTS_PROVIDER=simulada): no hay a
// dónde ir a pagar; la referencia que se le envía al confirmar decide cómo termina el pago.
export type SimulatedOutcome = 'APROBADO' | 'RECHAZADO' | 'PENDIENTE'

// "-RECHAZADA" rechaza, "-PENDIENTE" lo deja pendiente y cualquier otra aprueba.
export function simulatedReference(reference: string, outcome: SimulatedOutcome): string {
  const suffix = outcome === 'RECHAZADO' ? '-RECHAZADA' : outcome === 'PENDIENTE' ? '-PENDIENTE' : ''
  return `SIM-${reference}${suffix}`
}
