import { Search } from 'lucide-react'
import { useId, useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react'
import type { Player } from '../api/players'
import { fullNameOf } from '../features/players/playerName'
import { positionCode, positionColor } from '../features/players/position'
import { normalize } from '../features/roles/labels'
import { PlayerAvatar } from './PlayerAvatar'
import './ListPage.css'
import './PlayerSearch.css'

interface PlayerSearchProps {
  players: Player[] // entre quiénes se busca, en el orden en que deben salir
  label: string // para el lector de pantalla y como texto de ayuda: "Buscar jugador"
  onChoose: (player: Player) => void
  inline?: boolean // dentro de una ventana: la lista va debajo del campo, siempre a la vista
  emptyText?: string // qué decir si no hay ningún jugador entre quienes buscar
}

const MAX_RESULTS = 6

// Buscador de jugador por nombre o documento, con la lista de coincidencias para elegir uno.
// Lo usan "Asignar jugador" (Plantilla) y "Asignar habilidades". Con el teclado: flechas para
// recorrer, Enter para elegir y Escape para cerrar.
export function PlayerSearch({ players, label, onChoose, inline = false, emptyText }: PlayerSearchProps) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  // El backend no filtra: nombre completo (en cualquier orden) o documento, sin tildes.
  const matches = useMemo(() => {
    const text = normalize(query.trim())
    const found = text
      ? players.filter(
          (player) =>
            normalize(fullNameOf(player)).includes(text) ||
            normalize(`${player.lastName} ${player.firstName}`).includes(text) ||
            player.documentNumber.includes(text),
        )
      : players
    return found.slice(0, MAX_RESULTS)
  }, [players, query])

  const showList = inline || open
  const active = Math.min(activeIndex, Math.max(matches.length - 1, 0))

  function choose(player: Player) {
    setQuery('')
    setOpen(false)
    setActiveIndex(0)
    onChoose(player)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      if (matches.length === 0) return
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((active + step + matches.length) % matches.length)
    } else if (event.key === 'Enter') {
      // En una ventana, Enter no debe enviar el formulario mientras se elige al jugador.
      if (showList) event.preventDefault()
      if (showList && matches[active]) choose(matches[active])
    } else if (event.key === 'Escape' && open && !inline) {
      event.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div className={`player-search${inline ? ' player-search--inline' : ''}`}>
      <label className="list-search">
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          role="combobox"
          autoComplete="off"
          placeholder={label}
          aria-label={label}
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && matches[active] ? `${listId}-${matches[active].id}` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActiveIndex(0)
          }}
          onFocus={() => setOpen(true)}
          // Al salir del campo la lista se cierra (elegir con el mouse no saca el foco: ver onMouseDown).
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
        />
      </label>

      {showList && (
        <ul id={listId} className="player-search__list" role="listbox" aria-label="Jugadores encontrados">
          {matches.length === 0 ? (
            <li className="player-search__empty" role="presentation">
              {players.length === 0
                ? (emptyText ?? 'No hay jugadores para elegir.')
                : 'Ningún jugador coincide con la búsqueda.'}
            </li>
          ) : (
            matches.map((player, index) => (
              <li
                key={player.id}
                id={`${listId}-${player.id}`}
                role="option"
                aria-selected={index === active}
                className={`player-search__option${index === active ? ' is-active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(player)}
              >
                <PlayerAvatar player={player} size="sm" />
                <span className="player-search__text">
                  <span className="player-search__name">{fullNameOf(player)}</span>
                  <span className="player-search__detail">
                    {player.documentType} {player.documentNumber}
                  </span>
                </span>
                {player.position && (
                  <span
                    className="tag"
                    title={player.position}
                    style={{ '--tag': positionColor(player.position) } as CSSProperties}
                  >
                    {positionCode(player.position)}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
