import { Search, UserPlus, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '../../api/client'
import { assignTeamsToGroup } from '../../api/groupTeams'
import type { Group } from '../../api/groups'
import type { TeamSummary } from '../../api/teams'
import { TeamMonogram } from '../../components/TeamMonogram'
import { plural } from '../../utils/plural'
import { normalize } from '../roles/labels'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'
import './Phases.css'

interface AssignTeamsDialogProps {
  group: Group
  candidates: TeamSummary[] // inscritos, activos y sin grupo en esta fase
  onClose: () => void
  onAssigned: (group: Group, count: number) => void
}

// Con más equipos que estos aparece el buscador.
const SEARCH_FROM = 8

// Asignar uno o varios equipos a un grupo (HU-GC-04). Solo se ofrecen los que el backend acepta; aun
// así, si alguno ya no cumple (otra persona lo movió), no entra ninguno y el mensaje dice cuál.
export function AssignTeamsDialog({ group, candidates, onClose, onAssigned }: AssignTeamsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<ReadonlySet<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const shown = useMemo(() => {
    const text = normalize(query.trim())
    return candidates.filter((team) => !text || normalize(team.name).includes(text))
  }, [candidates, query])

  function toggle(teamId: number) {
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(teamId)) next.delete(teamId)
      else next.add(teamId)
      return next
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (picked.size === 0) return
    setError(null)
    setLoading(true)
    try {
      onAssigned(await assignTeamsToGroup(group.id, [...picked]), picked.size)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="form-dialog" onClose={onClose} aria-labelledby="assign-teams-title">
      <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
        <div className="form-dialog__head">
          <span className="panel-head__icon" aria-hidden="true">
            <UserPlus size={16} />
          </span>
          <h2 id="assign-teams-title" className="panel__title">
            Asignar equipos a {group.name}
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

        <p className="form-dialog__note">
          Solo aparecen los equipos inscritos y activos que todavía no tienen grupo en {group.phase.name}.
        </p>

        {candidates.length > SEARCH_FROM && (
          <label className="list-search assoc__search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar equipo"
              aria-label="Buscar equipos para asignar"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        )}

        <div className="pick-list__bar">
          <span aria-live="polite">
            {picked.size === 0 ? 'Elige uno o varios equipos.' : `${plural(picked.size, 'equipo elegido', 'equipos elegidos')}.`}
          </span>
          {picked.size > 0 ? (
            <button type="button" className="button button--text" onClick={() => setPicked(new Set())}>
              Quitar selección
            </button>
          ) : (
            shown.length > 1 && (
              <button
                type="button"
                className="button button--text"
                onClick={() => setPicked(new Set(shown.map((team) => team.id)))}
              >
                Elegir todos
              </button>
            )
          )}
        </div>

        {shown.length === 0 ? (
          <p className="empty-state">Ningún equipo coincide con la búsqueda.</p>
        ) : (
          <ul className="pick-list" aria-label="Equipos que se pueden asignar">
            {shown.map((team) => (
              <li key={team.id}>
                <label className={`pick-list__item${picked.has(team.id) ? ' is-checked' : ''}`}>
                  <input type="checkbox" checked={picked.has(team.id)} onChange={() => toggle(team.id)} />
                  <TeamMonogram team={team} size="sm" />
                  <span className="pick-list__name">{team.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p className="login__error" role="alert">
            {error}
          </p>
        )}

        <div className="form-dialog__actions">
          <button type="button" className="button button--outline" onClick={() => dialogRef.current?.close()}>
            Cancelar
          </button>
          <button type="submit" className="button button--primary" disabled={loading || picked.size === 0}>
            {loading ? 'Asignando…' : picked.size > 1 ? `Asignar ${picked.size} equipos` : 'Asignar'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
