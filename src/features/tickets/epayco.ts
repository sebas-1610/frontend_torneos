// La ventana de pago de ePayco (Smart Checkout v2, docs.davipay.com): se carga su script, se abre sobre
// la página con el sessionId que creó el backend y se escuchan sus eventos. El número de la tarjeta se
// escribe allá, nunca en este sistema.

const SCRIPT_URL = 'https://checkout.epayco.co/checkout-v2.js'

interface EpaycoHooks {
  onCreated?: (data: unknown) => void
  onResponse?: (response: unknown) => void
  onErrors?: (error: unknown) => void
  onClosed?: (errors: unknown) => void
}

interface EpaycoCheckout {
  setHooks: (hooks: EpaycoHooks) => void
  open: () => void
}

interface Epayco {
  checkout: {
    configure: (options: { sessionId: string; type: 'onpage' | 'standard'; test: boolean }) => EpaycoCheckout
  }
}

declare global {
  interface Window {
    ePayco?: Epayco
  }
}

let loading: Promise<Epayco> | null = null

// El script se pide una sola vez, la primera vez que hace falta pagar.
function loadEpayco(): Promise<Epayco> {
  if (window.ePayco) return Promise.resolve(window.ePayco)
  if (!loading) {
    loading = new Promise<Epayco>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = SCRIPT_URL
      script.async = true
      script.onload = () => {
        if (window.ePayco) resolve(window.ePayco)
        else reject(new Error('La ventana de pago de ePayco no se pudo iniciar.'))
      }
      script.onerror = () => {
        loading = null // se puede volver a intentar
        script.remove()
        reject(new Error('No se pudo cargar la ventana de pago de ePayco: revisa tu conexión e inténtalo de nuevo.'))
      }
      document.head.appendChild(script)
    })
  }
  return loading
}

// La ref_payco: 24 caracteres hexadecimales, en un campo cuyo nombre habla de "ref" (ref_payco,
// x_ref_payco, refPayco...). La respuesta del checkout no tiene una forma documentada: se busca adentro.
const REF_PAYCO = /^[0-9a-f]{24}$/i

export function refPaycoIn(value: unknown, depth = 0): string | null {
  if (depth > 4 || value === null || typeof value !== 'object') return null
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === 'string' && /ref/i.test(key) && REF_PAYCO.test(item)) return item
  }
  for (const item of Object.values(value as Record<string, unknown>)) {
    const found = refPaycoIn(item, depth + 1)
    if (found) return found
  }
  return null
}

export interface CheckoutEvents {
  onPaid: (gatewayReference: string) => void // terminó un pago y se sabe su referencia
  onClosed: (paid: boolean) => void // se cerró la ventana (paid: si antes llegó un pago)
  onError: (message: string) => void
}

// Abre la ventana de pago sobre la página. Si el script no carga, la promesa falla con el motivo.
export async function openEpaycoCheckout(
  checkout: { sessionId: string; test: boolean },
  events: CheckoutEvents,
): Promise<void> {
  const ePayco = await loadEpayco()
  let paid = false
  const handle = ePayco.checkout.configure({ sessionId: checkout.sessionId, type: 'onpage', test: checkout.test })
  handle.setHooks({
    onResponse: (response) => {
      const reference = refPaycoIn(response)
      if (reference && !paid) {
        paid = true
        events.onPaid(reference)
      }
    },
    onErrors: (error) => {
      const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : null
      events.onError(message ?? 'ePayco no pudo procesar el pago.')
    },
    onClosed: () => events.onClosed(paid),
  })
  handle.open()
}

// Si ePayco devolvió al aficionado a esta página, la URL trae la referencia del pago dentro del hash:
// "#mis-boletos?ref_payco=6b023dd2fc579a5edabd7205". null si no la trae.
export function refPaycoFromHash(): string | null {
  const query = window.location.hash.split('?')[1]
  if (!query) return null
  const reference = new URLSearchParams(query).get('ref_payco')
  return reference && /^[A-Za-z0-9-]{1,40}$/.test(reference) ? reference : null
}

// Quita la referencia de la barra de direcciones (sin agregar un paso al botón "Atrás").
export function clearHashQuery() {
  const [route] = window.location.hash.split('?')
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${route}`)
}
