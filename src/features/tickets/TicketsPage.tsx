import { CircleAlert, CreditCard, LoaderCircle, Store, Tickets } from 'lucide-react'
import { useMemo, useState } from 'react'
import { findMyPaymentMethods } from '../../api/fanPaymentMethods'
import { findMyTickets, findTicketSales, type TicketPurchase, type TicketSale } from '../../api/tickets'
import { canOpenPage, RESOURCES, useAccess } from '../../auth/access'
import { ActionAlert, type ActionError } from '../../components/ActionAlert'
import { ListPanel } from '../../components/ListView'
import { PageHeading } from '../../components/PageHeading'
import { useConfirm } from '../../hooks/useConfirm'
import { useLoadList } from '../../hooks/useLoadList'
import { useToast } from '../../hooks/useToast'
import { matchTitle } from '../matches/matchInfo'
import { usable } from '../payment-methods/paymentMethodInfo'
import { BuyTicketsDialog } from './BuyTicketsDialog'
import { checkoutOf, rememberCheckout, storedCheckout, type StoredCheckout } from './pendingCheckouts'
import { PurchaseCard } from './PurchaseCard'
import { gatewayLabel, holdUntil, purchasesOf, ticketsSentence } from './ticketInfo'
import { TicketSaleCard } from './TicketSaleCard'
import { useTicketPayment } from './useTicketPayment'
import '../../components/ListPage.css'
import '../../components/Vivid.css'
import '../matches/Matches.css'
import '../bets/Bets.css'
import './Tickets.css'

// Pantalla "Boletos" (HU-GE-04, del rol Aficionado): arriba, los partidos que hoy venden entradas con
// cada localidad y su precio; abajo, sus compras con el código de cada boleto. Comprar abre la pasarela
// de pago cuando hace falta (ePayco) y, al pagar, el backend confirma el pago con la pasarela.
export function TicketsPage() {
  const { can } = useAccess()
  const { showToast, toast } = useToast()
  const { confirm, confirmDialog } = useConfirm()
  const salesList = useLoadList(findTicketSales)
  const ticketsList = useLoadList(findMyTickets)
  // Para comprar hay que elegir uno de sus métodos de pago.
  const canListMethods = can(RESOURCES.fanPaymentMethods, 'LIST')
  const methodsList = useLoadList(findMyPaymentMethods, canListMethods)
  const canBuy = can(RESOURCES.tickets, 'CREATE') && canListMethods
  const canConfirm = can(RESOURCES.tickets, 'UPDATE')

  const [buying, setBuying] = useState<TicketSale | null>(null)
  const [actionError, setActionError] = useState<ActionError | null>(null)

  const purchases = useMemo(() => purchasesOf(ticketsList.items), [ticketsList.items])
  const methods = useMemo(() => methodsList.items.filter(usable), [methodsList.items])
  const noMethods = canBuy && !methodsList.loading && !methodsList.loadError && methods.length === 0
  const lockedReason = noMethods ? 'Primero agrega un método de pago activo' : null

  // Cuántos boletos (pagados o pendientes) ya tiene para cada partido, para decirlo en su tarjeta.
  const mineByMatch = useMemo(() => {
    const count = new Map<number, number>()
    for (const ticket of ticketsList.items) {
      if (ticket.status !== 'PAGADO' && ticket.status !== 'PENDIENTE') continue
      count.set(ticket.match.id, (count.get(ticket.match.id) ?? 0) + 1)
    }
    return count
  }, [ticketsList.items])

  function refresh() {
    ticketsList.reload()
    salesList.reload() // lo disponible de cada localidad cambió
  }

  // Cómo quedó un pago, contado como lo entiende el aficionado.
  function report(purchase: TicketPurchase) {
    refresh()
    const title = matchTitle(purchase.tickets[0].match)
    const where = gatewayLabel(purchase.gateway)
    switch (purchase.status) {
      case 'PAGADO':
        setActionError(null)
        showToast(
          purchase.quantity === 1
            ? `Pago aprobado: tu boleto para ${title} quedó pagado.`
            : `Pago aprobado: tus ${purchase.quantity} boletos para ${title} quedaron pagados.`,
        )
        break
      case 'PENDIENTE':
        showToast(`El pago sigue pendiente en ${where}: consúltalo de nuevo en unos minutos.`)
        break
      case 'RECHAZADO':
        setActionError({
          title: `${where.charAt(0).toUpperCase()}${where.slice(1)} no aprobó el pago`,
          message: `${purchase.detail ?? 'El pago fue rechazado'}. Los boletos no quedaron comprados: puedes intentar con otra compra.`,
        })
        break
      case 'ANULADO':
        setActionError({
          title: 'La compra se anuló',
          message: purchase.detail ?? 'El pago llegó cuando ya no se podían entregar los boletos.',
        })
        break
    }
  }

  const payment = useTicketPayment({
    onResult: report,
    onClosed: (stored) => {
      refresh()
      const purchase = purchases.find((item) => item.reference === stored.reference)
      showToast(
        `Cerraste el pago sin terminarlo: tus boletos quedan apartados${
          purchase ? ` hasta las ${holdUntil(purchase.first.createdAt)}` : ' 15 minutos'
        }. Vuelve con "Ir a pagar".`,
      )
    },
    onError: (error) => {
      refresh()
      setActionError(error)
    },
  })

  // En localhost ePayco no puede devolver al aficionado a esta página (no acepta ese nombre como página
  // de regreso): al terminar muestra su comprobante y el pago no se confirma aquí. Se avisa antes de abrir
  // su ventana, que tapa la pantalla.
  async function startPayment(stored: StoredCheckout) {
    rememberCheckout(stored) // para "Ir a pagar", aunque no la abra ahora
    if (stored.gateway === 'ePayco' && window.location.hostname === 'localhost') {
      const confirmed = await confirm({
        title: 'El pago no se confirmará solo',
        message:
          'Estás usando el sistema en localhost: al terminar de pagar, ePayco muestra su comprobante y no puede ' +
          'volver aquí, así que tus boletos seguirán pendientes. Para probar el pago completo, abre el sistema en ' +
          '127.0.0.1 (con esa misma dirección en FRONT_URL del backend).',
        confirmLabel: 'Abrir ePayco de todos modos',
        cancelLabel: 'Ahora no',
        tone: 'neutral',
      })
      if (!confirmed) {
        refresh()
        showToast('Tus boletos quedan apartados 15 minutos: vuelve a ellos con "Ir a pagar".')
        return
      }
    }
    payment.pay(stored)
  }

  function bought(purchase: TicketPurchase) {
    setBuying(null)
    setActionError(null)
    if (purchase.status === 'PAGADO') {
      refresh()
      const codes = purchase.tickets.map((ticket) => ticket.code).join(', ')
      showToast(
        purchase.quantity === 1
          ? `Compra confirmada: tu boleto ${codes} quedó pagado.`
          : `Compra confirmada: ${purchase.quantity} boletos pagados (${codes}).`,
      )
      return
    }
    refresh()
    const stored = checkoutOf(purchase)
    if (stored) void startPayment(stored)
  }

  const finding =
    ticketsList.loading || salesList.loading
      ? 'Cargando tus boletos…'
      : ticketsList.loadError
        ? 'No se pudieron cargar tus boletos.'
        : ticketsSentence(purchases, salesList.items.length)

  return (
    <div className="page page--vivid bets-page tickets-page">
      <PageHeading icon={Tickets} title="Boletos" finding={finding} />

      {noMethods && (
        <p className="bets-notice" role="status">
          <CreditCard size={18} aria-hidden="true" />
          <span>Para comprar boletos necesitas un método de pago activo.</span>
          {canOpenPage('mis-metodos-pago', can) && (
            <a className="text-action" href="#mis-metodos-pago">
              Ir a Mis métodos de pago
            </a>
          )}
        </p>
      )}
      {methodsList.loadError && (
        <p className="inline-error" role="alert">
          <CircleAlert size={16} aria-hidden="true" />
          <span>No se pudieron cargar tus métodos de pago: {methodsList.loadError}</span>
          <button type="button" className="text-action" onClick={methodsList.retry}>
            Reintentar
          </button>
        </p>
      )}
      {payment.opening && (
        <p className="bets-notice" role="status">
          <LoaderCircle size={18} aria-hidden="true" className="spin" />
          <span>Abriendo la ventana de pago de ePayco…</span>
        </p>
      )}
      {actionError && <ActionAlert error={actionError} onDismiss={() => setActionError(null)} />}

      <ListPanel
        title="Partidos con venta de entradas"
        titleId="ticket-sales-title"
        icon={Store}
        noun={['partido', 'partidos']}
        total={salesList.items.length}
        loading={salesList.loading}
        loadError={salesList.loadError}
        onRetry={salesList.retry}
        emptyMessage={
          salesList.items.length > 0
            ? null
            : 'Hoy ningún partido vende entradas. Aparecen aquí cuando el administrador abre la venta.'
        }
      >
        <ul className="bet-cards">
          {salesList.items.map((sale, index) => (
            <TicketSaleCard
              key={sale.match.id}
              sale={sale}
              index={index}
              mine={mineByMatch.get(sale.match.id) ?? 0}
              canBuy={canBuy}
              lockedReason={lockedReason}
              onBuy={(chosen) => {
                setActionError(null)
                setBuying(chosen)
              }}
            />
          ))}
        </ul>
      </ListPanel>

      <ListPanel
        title="Mis boletos"
        titleId="my-tickets-title"
        icon={Tickets}
        noun={['compra', 'compras']}
        total={purchases.length}
        loading={ticketsList.loading}
        loadError={ticketsList.loadError}
        onRetry={ticketsList.retry}
        emptyMessage={
          purchases.length > 0
            ? null
            : canBuy
              ? 'Todavía no tienes boletos: elige un partido de arriba y toca "Comprar boletos".'
              : 'Todavía no tienes boletos.'
        }
      >
        <ul className="stubs">
          {purchases.map((purchase, index) => {
            const pending = purchase.status === 'PENDIENTE' && canConfirm
            const stored = pending ? storedCheckout(purchase.reference) : null
            return (
              <PurchaseCard
                key={purchase.reference}
                purchase={purchase}
                index={index}
                busy={payment.busyReference === purchase.reference}
                // Volver a la ventana de pago solo si la pasarela todavía no tiene un pago en curso (en la de
                // prueba sí, porque es la forma de terminar uno que se dejó pendiente).
                onPay={
                  stored && (!purchase.first.gatewayReference || stored.gateway !== 'ePayco')
                    ? () => void startPayment(stored)
                    : undefined
                }
                onCheck={
                  pending && purchase.first.gatewayReference ? () => void payment.confirm(purchase.reference) : undefined
                }
              />
            )
          })}
        </ul>
      </ListPanel>

      {buying && (
        <BuyTicketsDialog sale={buying} methods={methods} onClose={() => setBuying(null)} onBought={bought} />
      )}
      {payment.checkoutDialog}
      {confirmDialog}
      {toast}
    </div>
  )
}
