import { request } from './client'

// Ruta /api/deportiva/payment-methods (ms_torneos_deportiva, HU-GC-10): el catálogo de formas de pago
// que acepta la plataforma. Lo siembra el backend; aquí solo se consulta.

// Qué datos pide cada tipo: tarjeta (titular, franquicia, últimos 4 y vencimiento), cuenta bancaria
// (banco, tipo y últimos 4) o billetera (celular).
export type PaymentMethodKind = 'TARJETA' | 'CUENTA_BANCARIA' | 'BILLETERA'

export interface PaymentMethod {
  id: number
  code: string // "TARJETA_CREDITO", "PSE", "NEQUI"...
  name: string // "Tarjeta de crédito"
  kind: PaymentMethodKind
}

export function findPaymentMethods(): Promise<PaymentMethod[]> {
  return request<PaymentMethod[]>('/deportiva/payment-methods')
}
