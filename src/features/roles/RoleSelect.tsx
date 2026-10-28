import { Check, ChevronDown, UserRound } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import type { Role } from '../../api/security'

interface RoleSelectProps {
  roles: Role[]
  value: number | null
  disabled?: boolean
  onChange: (roleId: number) => void
}

// Selector con el aspecto del diseño, pero con el comportamiento de teclado de un listbox nativo.
export function RoleSelect({ roles, value, disabled, onChange }: RoleSelectProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const id = useId()
  const labelId = `${id}-label`
  const listId = `${id}-list`

  const selected = roles.find((role) => role.id === value)

  useEffect(() => {
    if (!open) return
    listRef.current?.focus()
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  function openList() {
    if (disabled || roles.length === 0) return
    setActiveIndex(Math.max(0, roles.findIndex((role) => role.id === value)))
    setOpen(true)
  }

  function close() {
    setOpen(false)
    buttonRef.current?.focus()
  }

  function choose(index: number) {
    const role = roles[index]
    close()
    if (role) onChange(role.id)
  }

  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openList()
    }
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((index) => Math.min(roles.length - 1, index + 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((index) => Math.max(0, index - 1))
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(roles.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        choose(activeIndex)
        break
      case 'Escape':
        event.preventDefault()
        close()
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div className="role-select" ref={rootRef}>
      <span id={labelId} className="field-label">
        Rol seleccionado
      </span>
      <button
        ref={buttonRef}
        type="button"
        className="role-select__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${labelId} ${id}-value`}
        disabled={disabled || roles.length === 0}
        onClick={() => (open ? close() : openList())}
        onKeyDown={handleButtonKeyDown}
      >
        <UserRound size={22} aria-hidden="true" />
        <span id={`${id}-value`} className="role-select__value">
          {selected?.name ?? (roles.length === 0 ? 'Sin roles registrados' : 'Selecciona un rol')}
        </span>
        <ChevronDown size={20} aria-hidden="true" className={`role-select__chevron${open ? ' is-open' : ''}`} />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelId}
          aria-activedescendant={`${id}-option-${activeIndex}`}
          className="role-select__list"
          onKeyDown={handleListKeyDown}
        >
          {roles.map((role, index) => {
            const isSelected = role.id === value
            return (
              <li
                key={role.id}
                id={`${id}-option-${index}`}
                data-index={index}
                role="option"
                aria-selected={isSelected}
                className={`role-select__option${index === activeIndex ? ' is-active' : ''}${isSelected ? ' is-selected' : ''}`}
                onPointerEnter={() => setActiveIndex(index)}
                onClick={() => choose(index)}
              >
                <UserRound size={20} aria-hidden="true" />
                <span className="role-select__option-name">{role.name}</span>
                {isSelected && <Check size={18} aria-hidden="true" className="role-select__check" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
