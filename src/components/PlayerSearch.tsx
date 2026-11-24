import { Search } from 'lucide-react'
import { useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import type { Player } from '../api/players'
import { fullNameOf } from '../features/players/playerName'
import { positionCode, positionColor } from '../features/players/position'
import { normalize } from '../features/roles/labels'
import { plural } from '../utils/plural'
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

// Buscador de jugador por nombre o documento, con la lista de coincidencias para elegir uno.
// Lo usan "Asignar jugador" (Plantilla), "Asignar habilidades" y "Perfil deportivo". Salen todas las
// coincidencias (la lista tiene su propia barra de desplazamiento) y arriba dice cuántas son.
// Con el teclado: flechas para recorrer, Enter para elegir y Escape para cerrar.
export function PlayerSearch({ players, label, onChoose, inline = false, emptyText }: PlayerSearchProps) {
  const listId = useId()
  const listRef = useRef<HTMLUListElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  // El backend no filtra: nombre completo (en cualquier orden) o documento, sin tildes.
  const text = normalize(query.trim())
  const matches = useMemo(
    () =>
      text
        ? players.filter(
            (player) =>
              normalize(fullNameOf(player)).includes(text) ||
              normalize(`${player.lastName} ${player.firstName}`).includes(text) ||
              player.documentNumber.includes(text),
          )
        : players,
    [players, text],
  )

  const showList = inline || open
  const active = Math.min(activeIndex, Math.max(matches.length - 1, 0))
  const optionId = (player: Player) => `${listId}-${player.id}`

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
      const next = (active + step + matches.length) % matches.length
      setActiveIndex(next)
      // Con muchos jugadores la lista se desplaza: el marcado no debe quedar fuera de la vista.
      document.getElementById(optionId(matches[next]))?.scrollIntoView({ block: 'nearest' })
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
          aria-activedescendant={showList && matches[active] ? optionId(matches[active]) : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActiveIndex(0)
            listRef.current?.scrollTo({ top: 0 }) // la primera coincidencia es la marcada
          }}
          onFocus={() => setOpen(true)}
          // Al salir del campo la lista se cierra (elegir con el mouse no saca el foco: ver onMouseDown).
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
        />
      </label>

      {showList && (
        <ul
          ref={listRef}
          id={listId}
          className="player-search__list"
          role="listbox"
          aria-label={`Jugadores encontrados: ${matches.length}`}
        >
          {matches.length === 0 ? (
            <li className="player-search__empty" role="presentation">
              {players.length === 0
                ? (emptyText ?? 'No hay jugadores para elegir.')
                : 'Ningún jugador coincide con la búsqueda.'}
            </li>
          ) : (
            <li className="player-search__count num" role="presentation" aria-hidden="true">
              {text
                ? plural(matches.length, 'coincidencia', 'coincidencias')
                : `${plural(matches.length, 'jugador', 'jugadores')} · escribe para filtrar`}
            </li>
          )}
          {matches.map((player, index) => (
            <li
              key={player.id}
              id={optionId(player)}
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
          ))}
        </ul>
      )}
    </div>
  )
}
