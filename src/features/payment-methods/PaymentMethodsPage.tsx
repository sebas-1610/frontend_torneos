import { CreditCard, Plus, ShieldCheck, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { errorMessage } from '../../api/client'
import {
  deleteMyPaymentMethod,
  disableMyPaymentMethod,
  enableMyPaymentMethod,
  findMyPaymentMethods,
  type FanPaymentMethod,
} from '../../api/fanPaymentMethods'
import { findPaymentMethods, type PaymentMethodKind } from '../../api/paymentMethods'
import { RESOURCES, useAccess } from '../../auth/access'
import type { ActionError } from '../../components/ActionAlert'
import { SubjectItem } from '../../components/ConfirmDialog'
import { ListPanel, ListToolbar, ToolbarButton } from '../../components/ListView'
import { PageHeading } from '../../components/PageHeading'
import { useConfirm } from '../../hooks/useConfirm'
import { useLoadList } from '../../hooks/useLoadList'
import { useToast } from '../../hooks/useToast'
import { normalize } from '../roles/labels'
import { PaymentMethodCard } from './PaymentMethodCard'
import { PaymentMethodFormDialog } from './PaymentMethodFormDialog'
import { fanMethodLabel, KINDS, methodDetail, methodNumber, paymentMethodsSentence } from './paymentMethodInfo'
import '../../components/ListPage.css'
import '../../components/Association.css'
import '../../components/Vivid.css'
import './PaymentMethods.css'

// Pantalla "Mis métodos de pago" (HU-GC-10, del rol Aficionado): los suyos en tarjetas, con agregar,
// editar, activar o desactivar y eliminar. Cada aficionado ve solo los suyos (el backend lo saca del
// token).
export function PaymentMethodsPage() {
  const { can } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const { showToast, toast } = useToast()
  const { items: methods, setItems, loading, loadError, retry } = useLoadList(findMyPaymentMethods)
  // El catálogo solo hace falta para registrar uno (elegir su tipo).
  const canListCatalog = can(RESOURCES.paymentMethods, 'LIST')
  const catalog = useLoadList(findPaymentMethods, canListCatalog)
  const canCreate = can(RESOURCES.fanPaymentMethods, 'CREATE') && canListCatalog
  const canUpdate = can(RESOURCES.fanPaymentMethods, 'UPDATE')
  const canDelete = can(RESOURCES.fanPaymentMethods, 'DELETE')

  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<PaymentMethodKind | ''>('')
  const [editing, setEditing] = useState<FanPaymentMethod | 'new' | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<ActionError | null>(null)

  // Se busca por alias, nombre del catálogo, banco, últimos dígitos o celular (sin tildes).
  const visible = useMemo(() => {
    const text = normalize(query.trim())
    return methods.filter(
      (method) =>
        (kind === '' || method.paymentMethod.kind === kind) &&
        (!text ||
          [method.alias, method.paymentMethod.name, method.bankName, method.lastFour, method.phone, method.holderName]
            .filter((value): value is string => value !== null)
            .some((value) => normalize(value).includes(text))),
    )
  }, [methods, query, kind])

  const finding = loading
    ? 'Cargando tus métodos de pago…'
    : loadError
      ? 'No se pudieron cargar tus métodos de pago.'
      : paymentMethodsSentence(methods)

  function replace(saved: FanPaymentMethod) {
    setItems((list) => list.map((item) => (item.id === saved.id ? saved : item)))
  }

  const subjectOf = (method: FanPaymentMethod) => (
    <SubjectItem
      icon={KINDS[method.paymentMethod.kind].icon}
      name={fanMethodLabel(method)}
      detail={`${methodNumber(method)} · ${methodDetail(method)}`}
    />
  )

  async function run(method: FanPaymentMethod, failTitle: string, action: () => Promise<void>) {
    setBusyId(method.id)
    setActionError(null)
    try {
      await action()
    } catch (err) {
      setActionError({ title: failTitle, message: errorMessage(err) })
    } finally {
      setBusyId(null)
    }
  }

  async function toggle(method: FanPaymentMethod) {
    const name = fanMethodLabel(method)
    if (method.active) {
      const confirmed = await confirm({
        title: `¿Desactivar ${name}?`,
        message: 'Ya no podrás usarlo para apostar. Tus apuestas hechas con él no cambian y puedes activarlo después.',
        confirmLabel: 'Desactivar',
        subject: subjectOf(method),
      })
      if (!confirmed) return
    }
    await run(method, `No se pudo ${method.active ? 'desactivar' : 'activar'} ${name}`, async () => {
      const saved = method.active ? await disableMyPaymentMethod(method.id) : await enableMyPaymentMethod(method.id)
      replace(saved)
      showToast(saved.active ? `${name} quedó activo.` : `${name} quedó desactivado.`)
    })
  }

  async function remove(method: FanPaymentMethod) {
    const name = fanMethodLabel(method)
    const confirmed = await confirm({
      title: `¿Eliminar ${name}?`,
      message: 'Solo se elimina si nunca lo usaste para apostar; si ya tiene apuestas, desactívalo para conservarlas.',
      confirmLabel: 'Eliminar método de pago',
      subject: subjectOf(method),
    })
    if (!confirmed) return
    await run(method, `No se pudo eliminar ${name}`, async () => {
      await deleteMyPaymentMethod(method.id)
      setItems((list) => list.filter((item) => item.id !== method.id))
      showToast(`Se eliminó ${name}.`)
    })
  }

  return (
    <div className="page page--vivid">
      <PageHeading icon={CreditCard} title="Mis métodos de pago" finding={finding} />

      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Buscar por alias, banco o últimos dígitos"
        actions={
          canCreate && (
            <ToolbarButton
              primary
              icon={Plus}
              label="Agregar método de pago"
              onClick={() => {
                setActionError(null)
                setEditing('new')
              }}
            />
          )
        }
      >
        <select aria-label="Filtrar por tipo" value={kind} onChange={(e) => setKind(e.target.value as PaymentMethodKind | '')}>
          <option value="">Todos los tipos</option>
          {(Object.keys(KINDS) as PaymentMethodKind[]).map((item) => (
            <option key={item} value={item}>
              {KINDS[item].label}
            </option>
          ))}
        </select>
      </ListToolbar>

      <ListPanel
        title="Tus métodos de pago"
        titleId="payment-methods-title"
        icon={Wallet}
        noun={['método', 'métodos']}
        total={methods.length}
        shown={visible.length}
        loading={loading}
        loadError={loadError}
        onRetry={retry}
        error={actionError}
        onDismissError={() => setActionError(null)}
        emptyMessage={
          visible.length > 0
            ? null
            : methods.length > 0
              ? 'Ningún método de pago coincide con la búsqueda.'
              : canCreate
                ? 'Todavía no tienes métodos de pago. Agrega el primero con "Agregar método de pago".'
                : 'Todavía no tienes métodos de pago.'
        }
      >
        <ul className="pay-cards">
          {visible.map((method, index) => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              index={index}
              busy={busyId === method.id}
              onEdit={canUpdate ? setEditing : undefined}
              onToggle={canUpdate ? toggle : undefined}
              onDelete={canDelete ? remove : undefined}
            />
          ))}
        </ul>
      </ListPanel>

      <p className="assoc__note">
        <ShieldCheck size={16} aria-hidden="true" />
        Solo se guardan los datos para reconocer cada método (últimos 4 dígitos, banco o celular), nunca el número
        completo ni el código de seguridad. Una tarjeta vencida o un método desactivado no sirve para apostar.
      </p>

      {editing && (
        <PaymentMethodFormDialog
          catalog={catalog.items}
          method={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved, isNew) => {
            setEditing(null)
            setActionError(null)
            if (isNew) setItems((list) => [...list, saved])
            else replace(saved)
            showToast(isNew ? `Se agregó ${fanMethodLabel(saved)}.` : 'Cambios guardados.')
          }}
        />
      )}
      {confirmDialog}
      {toast}
    </div>
  )
}
