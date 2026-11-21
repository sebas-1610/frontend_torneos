import { request } from './client'
import type { PaymentMethod } from './paymentMethods'

// Rutas de /api/deportiva/fan-payment-methods (ms_torneos_deportiva, HU-GC-10): los métodos de pago
// del aficionado que hace la petición (sale del token). Nunca se guarda el número completo ni el CVV.

export type CardBrand = 'VISA' | 'MASTERCARD' | 'AMEX' | 'DINERS'
export type AccountType = 'AHORROS' | 'CORRIENTE'

// Los datos que no son de su tipo llegan en null.
export interface FanPaymentMethod {
  id: number
  paymentMethod: PaymentMethod // del catálogo: su tipo dice qué datos tiene
  alias: string | null // "Mi Visa"
  holderName: string | null // tarjeta
  brand: CardBrand | null // tarjeta
  lastFour: string | null // tarjeta o cuenta bancaria
  expiryMonth: number | null // tarjeta
  expiryYear: number | null // tarjeta
  bankName: string | null // cuenta bancaria
  accountType: AccountType | null // cuenta bancaria
  phone: string | null // billetera
  expired: boolean // calculado con la fecha de hoy: solo una tarjeta vence
  active: boolean
}

// Lo que se envía al crear o editar: solo los datos de su tipo (los demás, null).
export interface FanPaymentMethodData {
  alias: string | null
  holderName: string | null
  brand: CardBrand | null
  lastFour: string | null
  expiryMonth: number | null
  expiryYear: number | null
  bankName: string | null
  accountType: AccountType | null
  phone: string | null
}

export function findMyPaymentMethods(): Promise<FanPaymentMethod[]> {
  return request<FanPaymentMethod[]>('/deportiva/fan-payment-methods')
}

// Una tarjeta vencida responde 400; un método repetido (mismo tipo y mismos datos), 409.
export function createMyPaymentMethod(paymentMethodId: number, data: FanPaymentMethodData): Promise<FanPaymentMethod> {
  return request<FanPaymentMethod>('/deportiva/fan-payment-methods', {
    method: 'POST',
    body: JSON.stringify({ paymentMethodId, ...data }),
  })
}

// PUT reemplaza los datos; el tipo del catálogo no cambia. Uno desactivado no se edita.
export function updateMyPaymentMethod(id: number, data: FanPaymentMethodData): Promise<FanPaymentMethod> {
  return request<FanPaymentMethod>(`/deportiva/fan-payment-methods/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

// Desactivado ya no sirve para apostar; sus apuestas siguen igual.
export function disableMyPaymentMethod(id: number): Promise<FanPaymentMethod> {
  return request<FanPaymentMethod>(`/deportiva/fan-payment-methods/${id}/disable`, { method: 'PATCH' })
}

export function enableMyPaymentMethod(id: number): Promise<FanPaymentMethod> {
  return request<FanPaymentMethod>(`/deportiva/fan-payment-methods/${id}/enable`, { method: 'PATCH' })
}

// Con apuestas no se elimina (400): se desactiva para conservarlas.
export function deleteMyPaymentMethod(id: number): Promise<void> {
  return request<void>(`/deportiva/fan-payment-methods/${id}`, { method: 'DELETE' })
}
