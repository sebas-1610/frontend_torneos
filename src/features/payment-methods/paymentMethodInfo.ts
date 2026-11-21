import { CreditCard, Landmark, Smartphone, type LucideIcon } from 'lucide-react'
import type { AccountType, CardBrand, FanPaymentMethod } from '../../api/fanPaymentMethods'
import type { PaymentMethodKind } from '../../api/paymentMethods'
import { plural } from '../../utils/plural'

// Textos y reglas de los métodos de pago del aficionado (HU-GC-10) que comparten su pantalla, su
// formulario y las apuestas.

interface KindInfo {
  label: string
  icon: LucideIcon
  tone: string // color de su icono (y de la opción elegida en el formulario)
  asks: string // qué datos pide, en el formulario
}

export const KINDS: Record<PaymentMethodKind, KindInfo> = {
  TARJETA: {
    label: 'Tarjeta',
    icon: CreditCard,
    tone: 'var(--tone-blue)',
    asks: 'Titular, franquicia, últimos 4 dígitos y vencimiento',
  },
  CUENTA_BANCARIA: {
    label: 'Cuenta bancaria',
    icon: Landmark,
    tone: 'var(--tone-purple)',
    asks: 'Banco, tipo de cuenta y últimos 4 dígitos',
  },
  BILLETERA: {
    label: 'Billetera digital',
    icon: Smartphone,
    tone: 'var(--tone-green)',
    asks: 'El celular de la cuenta',
  },
}

export const CARD_BRANDS: { value: CardBrand; label: string }[] = [
  { value: 'VISA', label: 'Visa' },
  { value: 'MASTERCARD', label: 'Mastercard' },
  { value: 'AMEX', label: 'American Express' },
  { value: 'DINERS', label: 'Diners Club' },
]

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'AHORROS', label: 'Ahorros' },
  { value: 'CORRIENTE', label: 'Corriente' },
]

export function brandLabel(brand: CardBrand): string {
  return CARD_BRANDS.find((item) => item.value === brand)?.label ?? brand
}

export function accountTypeLabel(type: AccountType): string {
  return ACCOUNT_TYPES.find((item) => item.value === type)?.label ?? type
}

// "3001234567" → "300 123 4567"
export function formatPhone(phone: string): string {
  return phone.length === 10 ? `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}` : phone
}

// "08/2031"
export function expiryText(month: number, year: number): string {
  return `${String(month).padStart(2, '0')}/${year}`
}

// Lo que identifica al método sin mostrar datos completos: "•••• 4242" o el celular.
export function methodNumber(method: Pick<FanPaymentMethod, 'lastFour' | 'phone'>): string {
  if (method.lastFour) return `•••• ${method.lastFour}`
  if (method.phone) return formatPhone(method.phone)
  return '—'
}

// Su nombre: el alias o, si no tiene, el del catálogo con lo que lo distingue ("Nequi 300 123 4567").
export function paymentLabel(method: { name: string; alias: string | null; lastFour: string | null; phone: string | null }): string {
  if (method.alias) return method.alias
  return `${method.name} ${methodNumber(method)}`
}

export function fanMethodLabel(method: FanPaymentMethod): string {
  return paymentLabel({ ...method, name: method.paymentMethod.name })
}

// Lo que dice su tarjeta en grande: el alias o, sin alias, la franquicia, el banco o la billetera.
export function methodTitle(method: FanPaymentMethod): string {
  if (method.alias) return method.alias
  switch (method.paymentMethod.kind) {
    case 'TARJETA':
      return method.brand ? brandLabel(method.brand) : method.paymentMethod.name
    case 'CUENTA_BANCARIA':
      return method.bankName ?? method.paymentMethod.name
    case 'BILLETERA':
      return method.paymentMethod.name
  }
}

// La línea de datos debajo, sin repetir lo que ya dice el título: "Visa · Ana Gómez · Vence 08/2031",
// "Bancolombia · Cuenta de ahorros".
export function methodDetail(method: FanPaymentMethod): string {
  const titled = method.alias !== null
  switch (method.paymentMethod.kind) {
    case 'TARJETA':
      return [
        titled && method.brand ? brandLabel(method.brand) : null,
        method.holderName,
        method.expiryMonth !== null && method.expiryYear !== null
          ? `${method.expired ? 'Venció' : 'Vence'} ${expiryText(method.expiryMonth, method.expiryYear)}`
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    case 'CUENTA_BANCARIA':
      return [
        titled ? method.bankName : null,
        method.accountType ? `Cuenta de ${accountTypeLabel(method.accountType).toLowerCase()}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    case 'BILLETERA':
      return titled ? method.paymentMethod.name : 'Billetera digital'
  }
}

// Sirve para apostar: activo y, si es tarjeta, sin vencer.
export function usable(method: FanPaymentMethod): boolean {
  return method.active && !method.expired
}

// "Tienes 3 métodos de pago: 2 sirven para apostar."
export function paymentMethodsSentence(methods: FanPaymentMethod[]): string {
  if (methods.length === 0) return 'Todavía no tienes métodos de pago: agrega uno para poder apostar.'
  const ready = methods.filter(usable).length
  const total = plural(methods.length, 'método de pago', 'métodos de pago')
  if (ready === methods.length) return `Tienes ${total} y ${methods.length === 1 ? 'sirve' : 'todos sirven'} para apostar.`
  if (ready === 0) return `Tienes ${total}, pero ninguno sirve para apostar: activa uno o agrega otro.`
  return `Tienes ${total}: ${ready} ${ready === 1 ? 'sirve' : 'sirven'} para apostar.`
}
