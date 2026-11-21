import { CreditCard, ShieldCheck, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { errorMessage } from '../../api/client'
import {
  createMyPaymentMethod,
  updateMyPaymentMethod,
  type AccountType,
  type CardBrand,
  type FanPaymentMethod,
  type FanPaymentMethodData,
} from '../../api/fanPaymentMethods'
import type { PaymentMethod } from '../../api/paymentMethods'
import { ACCOUNT_TYPES, CARD_BRANDS, KINDS } from './paymentMethodInfo'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'

interface PaymentMethodFormDialogProps {
  catalog: PaymentMethod[] // los tipos que acepta la plataforma
  method: FanPaymentMethod | null // null: registrar uno nuevo
  onClose: () => void
  onSaved: (method: FanPaymentMethod, isNew: boolean) => void
}

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)

// Registrar o editar un método de pago (HU-GC-10). Se elige el tipo del catálogo y se piden solo los
// datos de ese tipo, con las mismas reglas del backend. Nunca el número completo ni el código de
// seguridad: solo los últimos 4 dígitos.
export function PaymentMethodFormDialog({ catalog, method, onClose, onSaved }: PaymentMethodFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isNew = method === null
  const [paymentMethodId, setPaymentMethodId] = useState<number | null>(method?.paymentMethod.id ?? catalog[0]?.id ?? null)
  const [alias, setAlias] = useState(method?.alias ?? '')
  const [holderName, setHolderName] = useState(method?.holderName ?? '')
  const [brand, setBrand] = useState<CardBrand | ''>(method?.brand ?? '')
  const [lastFour, setLastFour] = useState(method?.lastFour ?? '')
  const [expiryMonth, setExpiryMonth] = useState(method?.expiryMonth ? String(method.expiryMonth) : '')
  const [expiryYear, setExpiryYear] = useState(method?.expiryYear ? String(method.expiryYear) : '')
  const [bankName, setBankName] = useState(method?.bankName ?? '')
  const [accountType, setAccountType] = useState<AccountType | ''>(method?.accountType ?? '')
  const [phone, setPhone] = useState(method?.phone ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  // Al editar, el tipo no cambia (si quedó mal, se elimina y se registra otro).
  const chosen = method?.paymentMethod ?? catalog.find((item) => item.id === paymentMethodId) ?? null
  const kind = chosen?.kind ?? null

  // Los años de vencimiento: desde este año; al editar, también el que tenía aunque ya pasó.
  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth() + 1
  const years = Array.from({ length: 16 }, (_, index) => thisYear + index)
  if (method?.expiryYear && !years.includes(method.expiryYear)) years.unshift(method.expiryYear)

  // Las mismas reglas que valida el backend (payment-data-fields.dto.ts y payment-data.rules.ts).
  const digits = phone.replace(/\s/g, '')
  const holderOk = holderName.trim().length >= 3 && holderName.trim().length <= 100
  const lastFourOk = /^\d{4}$/.test(lastFour)
  const month = Number(expiryMonth)
  const year = Number(expiryYear)
  const expiryChosen = expiryMonth !== '' && expiryYear !== ''
  const expired = expiryChosen && (year < thisYear || (year === thisYear && month < thisMonth))
  const bankOk = bankName.trim().length >= 2 && bankName.trim().length <= 60
  const phoneOk = /^3\d{9}$/.test(digits)
  const aliasOk = alias.trim().length <= 40
  const canSubmit =
    kind !== null &&
    aliasOk &&
    (kind === 'TARJETA'
      ? holderOk && brand !== '' && lastFourOk && expiryChosen && !expired
      : kind === 'CUENTA_BANCARIA'
        ? bankOk && accountType !== '' && lastFourOk
        : phoneOk)

  function dataFor(): FanPaymentMethodData {
    const none: FanPaymentMethodData = {
      alias: alias.trim() || null,
      holderName: null,
      brand: null,
      lastFour: null,
      expiryMonth: null,
      expiryYear: null,
      bankName: null,
      accountType: null,
      phone: null,
    }
    if (kind === 'TARJETA') {
      return {
        ...none,
        holderName: holderName.trim(),
        brand: brand || null,
        lastFour,
        expiryMonth: month,
        expiryYear: year,
      }
    }
    if (kind === 'CUENTA_BANCARIA') {
      return { ...none, bankName: bankName.trim(), accountType: accountType || null, lastFour }
    }
    return { ...none, phone: digits }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || chosen === null) return
    setError(null)
    setSaving(true)
    try {
      const saved = isNew
        ? await createMyPaymentMethod(chosen.id, dataFor())
        : await updateMyPaymentMethod(method.id, dataFor())
      onSaved(saved, isNew)
    } catch (err) {
      setError(errorMessage(err)) // ej: 409 "Ya registraste ese método de pago"
    } finally {
      setSaving(false)
    }
  }

  // Cuatro dígitos y nada más (se escribe solo lo que sirve).
  const onlyDigits = (value: string, max: number) => value.replace(/\D/g, '').slice(0, max)

  return (
    <dialog
      ref={dialogRef}
      className="form-dialog form-dialog--wide"
      onClose={onClose}
      aria-labelledby="payment-form-title"
    >
      <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
        <div className="form-dialog__head">
          <span className="panel-head__icon" aria-hidden="true">
            <CreditCard size={16} />
          </span>
          <h2 id="payment-form-title" className="panel__title">
            {isNew ? 'Nuevo método de pago' : 'Editar método de pago'}
          </h2>
          <button
            type="button"
            className="icon-button icon-button--small"
            aria-label="Cerrar"
            onClick={() => dialogRef.current?.close()}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {isNew ? (
          <fieldset className="type-choice">
            <legend className="type-choice__legend">Tipo</legend>
            <div className="type-choice__options pay-kinds">
              {catalog.map((item) => {
                const info = KINDS[item.kind]
                const Icon = info.icon
                const checked = item.id === paymentMethodId
                return (
                  <label
                    key={item.id}
                    className={`type-choice__option${checked ? ' is-checked' : ''}`}
                    style={{ '--tag': info.tone } as CSSProperties}
                  >
                    <input
                      type="radio"
                      name="payment-kind"
                      value={item.id}
                      checked={checked}
                      onChange={() => setPaymentMethodId(item.id)}
                    />
                    <span className="type-choice__icon" aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    <span className="type-choice__text">
                      <span className="type-choice__label">{item.name}</span>
                      <span className="type-choice__description">{info.asks}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        ) : (
          chosen && (
            <p className="form-dialog__note">
              {chosen.name}: el tipo no cambia. Si quedó mal, elimínalo y registra otro.
            </p>
          )
        )}

        <label className="login__field">
          <span>Alias (opcional)</span>
          <input
            autoComplete="off"
            maxLength={40}
            placeholder={kind === 'BILLETERA' ? 'Ej: Mi Nequi' : kind === 'CUENTA_BANCARIA' ? 'Ej: Ahorros nómina' : 'Ej: Mi Visa'}
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
          />
        </label>

        {kind === 'TARJETA' && (
          <>
            <div className="form-dialog__row">
              <label className="login__field">
                <span>Titular</span>
                <input
                  autoComplete="cc-name"
                  maxLength={100}
                  placeholder="Como aparece en la tarjeta"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                />
              </label>
              <label className="login__field">
                <span>Franquicia</span>
                <select value={brand} onChange={(e) => setBrand(e.target.value as CardBrand | '')}>
                  <option value="" disabled>
                    Elige la franquicia
                  </option>
                  {CARD_BRANDS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {holderName.trim() !== '' && !holderOk && (
              <p className="field-hint">El titular debe tener entre 3 y 100 caracteres.</p>
            )}
            <div className="form-dialog__row pay-form__card-row">
              <label className="login__field">
                <span>Últimos 4 dígitos</span>
                <input
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="4242"
                  value={lastFour}
                  onChange={(e) => setLastFour(onlyDigits(e.target.value, 4))}
                />
              </label>
              <label className="login__field">
                <span>Mes de vencimiento</span>
                <select value={expiryMonth} onChange={(e) => setExpiryMonth(e.target.value)}>
                  <option value="" disabled>
                    Mes
                  </option>
                  {MONTHS.map((item) => (
                    <option key={item} value={item}>
                      {String(item).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="login__field">
                <span>Año</span>
                <select value={expiryYear} onChange={(e) => setExpiryYear(e.target.value)}>
                  <option value="" disabled>
                    Año
                  </option>
                  {years.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {expired && <p className="field-hint">La tarjeta ya venció: no se puede registrar ni usar.</p>}
          </>
        )}

        {kind === 'CUENTA_BANCARIA' && (
          <div className="form-dialog__row pay-form__card-row">
            <label className="login__field">
              <span>Banco</span>
              <input
                autoComplete="off"
                maxLength={60}
                placeholder="Ej: Bancolombia"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </label>
            <label className="login__field">
              <span>Tipo de cuenta</span>
              <select value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType | '')}>
                <option value="" disabled>
                  Elige el tipo
                </option>
                {ACCOUNT_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="login__field">
              <span>Últimos 4 dígitos</span>
              <input
                inputMode="numeric"
                autoComplete="off"
                placeholder="1234"
                value={lastFour}
                onChange={(e) => setLastFour(onlyDigits(e.target.value, 4))}
              />
            </label>
          </div>
        )}

        {kind === 'BILLETERA' && (
          <>
            <label className="login__field">
              <span>Celular</span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="300 123 4567"
                value={phone}
                onChange={(e) => setPhone(onlyDigits(e.target.value, 10))}
              />
            </label>
            {digits !== '' && !phoneOk && (
              <p className="field-hint">El celular debe tener 10 dígitos y empezar por 3.</p>
            )}
          </>
        )}

        {kind !== 'BILLETERA' && lastFour !== '' && !lastFourOk && (
          <p className="field-hint">Escribe exactamente los últimos 4 dígitos.</p>
        )}

        <p className="assoc__note pay-form__safe">
          <ShieldCheck size={16} aria-hidden="true" />
          Nunca se pide el número completo ni el código de seguridad: solo lo necesario para reconocerlo.
        </p>

        {error && (
          <p className="login__error" role="alert">
            {error}
          </p>
        )}

        <div className="form-dialog__actions">
          <button type="button" className="button button--outline" onClick={() => dialogRef.current?.close()}>
            Cancelar
          </button>
          <button type="submit" className="button button--primary" disabled={saving || !canSubmit}>
            {saving ? 'Guardando…' : isNew ? 'Agregar método de pago' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
