import { Swords, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '../../api/client'
import { findGroupsByPhase, type Group } from '../../api/groups'
import { createMatch, updateMatch, type Match } from '../../api/matches'
import type { Phase } from '../../api/phases'
import type { TeamSummary } from '../../api/teams'
import { findRegistrationsByTournament } from '../../api/tournamentTeams'
import type { Tournament } from '../../api/tournaments'
import { useLoad } from '../../hooks/useLoad'
import { formatDateShort } from '../../utils/dates'
import { bracketsOf } from '../phases/phaseInfo'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'

interface MatchFormDialogProps {
  tournament: Tournament
  phases: Phase[] // en orden
  matches: Match[] // del torneo: las llaves ocupadas y quién ya juega en cada fase final
  match: Match | null // null: programar uno nuevo
  defaultPhaseId: number | null // la fase elegida en el filtro, para empezar con ella
  onClose: () => void
  onSaved: (match: Match, isNew: boolean) => void
}

interface TeamOptions {
  groups: Map<number, Group[]> // grupos de cada fase de grupos, con sus equipos
  registered: TeamSummary[] // equipos inscritos en el torneo
}

function byName(a: TeamSummary, b: TeamSummary): number {
  return a.name.localeCompare(b.name, 'es')
}

// Programar o editar un partido (HU-GC-06). Solo ofrece lo que el backend acepta: en grupos, equipos
// del mismo grupo; en una fase final, una llave libre y equipos que todavía no juegan en esa fase; la
// fecha, dentro del torneo. La fase no cambia al editar.
export function MatchFormDialog({
  tournament,
  phases,
  matches,
  match,
  defaultPhaseId,
  onClose,
  onSaved,
}: MatchFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isNew = match === null
  const [phaseId, setPhaseId] = useState<number | null>(
    match?.phase.id ?? defaultPhaseId ?? (phases.length === 1 ? phases[0].id : null),
  )
  const [groupId, setGroupId] = useState<number | null>(match?.group?.id ?? null)
  const [homeId, setHomeId] = useState<number | null>(match?.homeTeam.id ?? null)
  const [awayId, setAwayId] = useState<number | null>(match?.awayTeam.id ?? null)
  const [scheduledAt, setScheduledAt] = useState(match?.scheduledAt ?? '')
  const [round, setRound] = useState(match?.round !== null && match?.round !== undefined ? String(match.round) : '')
  const [bracket, setBracket] = useState<number | null>(match?.bracketPosition ?? null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  // Los grupos de las fases de grupos y los inscritos, de una vez: con eso se arman las listas de equipos.
  const fetchOptions = useCallback(async (): Promise<TeamOptions> => {
    const groupPhases = phases.filter((phase) => phase.type === 'GRUPOS')
    const [registrations, ...groups] = await Promise.all([
      findRegistrationsByTournament(tournament.id),
      ...groupPhases.map((phase) => findGroupsByPhase(phase.id)),
    ])
    return {
      groups: new Map(groupPhases.map((phase, index) => [phase.id, groups[index]])),
      registered: registrations.map((registration) => registration.team),
    }
  }, [phases, tournament.id])
  const options = useLoad(fetchOptions)

  const phase = phases.find((item) => item.id === phaseId) ?? null
  const isGroupPhase = phase?.type === 'GRUPOS'
  const phaseGroups = useMemo(
    () => (phase && options.data ? (options.data.groups.get(phase.id) ?? []) : []),
    [phase, options.data],
  )
  const group = phaseGroups.find((item) => item.id === groupId) ?? null

  // Otros partidos de la fase (no el que se edita): sus llaves y sus equipos ya están tomados.
  const others = useMemo(
    () => matches.filter((item) => item.phase.id === phaseId && item.id !== match?.id),
    [matches, phaseId, match],
  )
  const takenSlots = new Set(others.map((item) => item.bracketPosition))

  // Los equipos que pueden jugar: activos, del grupo elegido (fase de grupos) o inscritos sin partido
  // en la fase (fase final). Los del partido que se edita siempre están, aunque ya no cumplan.
  const teams = useMemo(() => {
    const playing = new Set(others.flatMap((item) => [item.homeTeam.id, item.awayTeam.id]))
    const source = isGroupPhase ? (group?.teams ?? []) : (options.data?.registered ?? [])
    const list = source.filter((team) => team.active && (isGroupPhase || !playing.has(team.id)))
    for (const own of match ? [match.homeTeam, match.awayTeam] : []) {
      const inSource = isGroupPhase ? group?.teams.some((team) => team.id === own.id) : true
      if (inSource && !list.some((team) => team.id === own.id)) list.push(own)
    }
    return list.sort(byName)
  }, [isGroupPhase, group, options.data, others, match])

  // Mismas reglas del backend (MatchFieldsDto y MatchesService).
  const min = `${tournament.startDate}T00:00`
  const max = `${tournament.endDate}T23:59`
  const outOfRange = scheduledAt !== '' && (scheduledAt < min || scheduledAt > max)
  const roundNumber = Number(round)
  const roundValid = round === '' || (Number.isInteger(roundNumber) && roundNumber >= 1 && roundNumber <= 99)
  const sameTeam = homeId !== null && homeId === awayId
  const canSubmit =
    phase !== null &&
    homeId !== null &&
    awayId !== null &&
    !sameTeam &&
    scheduledAt !== '' &&
    !outOfRange &&
    (isGroupPhase ? roundValid : bracket !== null)

  function choosePhase(id: number | null) {
    setPhaseId(id)
    setGroupId(null)
    setHomeId(null)
    setAwayId(null)
    setBracket(null)
    setRound('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || phase === null || homeId === null || awayId === null) return
    setError(null)
    setSaving(true)
    const input = {
      homeTeamId: homeId,
      awayTeamId: awayId,
      scheduledAt,
      round: isGroupPhase && round !== '' ? roundNumber : null,
      bracketPosition: isGroupPhase ? null : bracket,
    }
    try {
      onSaved(isNew ? await createMatch(phase.id, input) : await updateMatch(match.id, input), isNew)
    } catch (err) {
      setError(errorMessage(err)) // ej: 409 "La posición 1 de la llave ya la tiene…"
    } finally {
      setSaving(false)
    }
  }

  const teamSelect = (label: string, value: number | null, onChange: (id: number | null) => void, other: number | null) => (
    <label className="login__field">
      <span>{label}</span>
      <select
        value={value ?? ''}
        disabled={teams.length === 0}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      >
        <option value="" disabled>
          Elige un equipo
        </option>
        {teams.map((team) => (
          <option key={team.id} value={team.id} disabled={team.id === other}>
            {team.name}
          </option>
        ))}
      </select>
    </label>
  )

  // Por qué no hay equipos para elegir, si es el caso.
  const noTeams =
    phase === null || options.loading || options.loadError
      ? null
      : isGroupPhase
        ? phaseGroups.length === 0
          ? `"${phase.name}" todavía no tiene grupos: créalos en Fases y grupos.`
          : group !== null && teams.length < 2
            ? `${group.name} necesita al menos dos equipos activos para programar un partido.`
            : null
        : teams.length < 2
          ? 'No quedan al menos dos equipos inscritos y activos sin partido en esta fase.'
          : null

  return (
    <dialog ref={dialogRef} className="form-dialog form-dialog--wide" onClose={onClose} aria-labelledby="match-form-title">
      <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
        <div className="form-dialog__head">
          <span className="panel-head__icon" aria-hidden="true">
            <Swords size={16} />
          </span>
          <h2 id="match-form-title" className="panel__title">
            {isNew ? 'Programar partido' : 'Editar partido'}
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

        <div className="form-dialog__row">
          <label className="login__field">
            <span>Fase</span>
            <select
              value={phaseId ?? ''}
              disabled={!isNew}
              onChange={(e) => choosePhase(e.target.value === '' ? null : Number(e.target.value))}
            >
              <option value="" disabled>
                Elige una fase
              </option>
              {phases.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.order}. {item.name}
                </option>
              ))}
            </select>
          </label>
          {phase === null ? (
            <span aria-hidden="true" />
          ) : isGroupPhase ? (
            <label className="login__field">
              <span>Grupo</span>
              <select
                value={groupId ?? ''}
                disabled={options.loading || phaseGroups.length === 0}
                onChange={(e) => {
                  setGroupId(e.target.value === '' ? null : Number(e.target.value))
                  setHomeId(null)
                  setAwayId(null)
                }}
              >
                <option value="" disabled>
                  {options.loading ? 'Cargando grupos…' : 'Elige un grupo'}
                </option>
                {phaseGroups.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.teamsCount} equipos)
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="login__field">
              <span>Llave</span>
              <select value={bracket ?? ''} onChange={(e) => setBracket(e.target.value === '' ? null : Number(e.target.value))}>
                <option value="" disabled>
                  Elige una llave
                </option>
                {Array.from({ length: bracketsOf(phase) }, (_, index) => index + 1).map((slot) => (
                  <option key={slot} value={slot} disabled={takenSlots.has(slot)}>
                    Llave {slot}
                    {takenSlots.has(slot) ? ' (ya tiene partido)' : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {!isNew && (
          <p className="form-dialog__note">La fase no cambia: si quedó mal, elimina el partido y prográmalo de nuevo.</p>
        )}
        {options.loadError && (
          <p className="login__error" role="alert">
            No se pudieron cargar los equipos: {options.loadError}
          </p>
        )}

        {phase !== null && (isGroupPhase ? group !== null : true) && (
          <div className="form-dialog__row">
            {teamSelect('Local', homeId, setHomeId, awayId)}
            {teamSelect('Visitante', awayId, setAwayId, homeId)}
          </div>
        )}
        {noTeams && <p className="field-hint">{noTeams}</p>}

        <div className="form-dialog__row">
          <label className="login__field">
            <span>Fecha y hora</span>
            <input
              type="datetime-local"
              min={min}
              max={max}
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value.slice(0, 16))}
            />
          </label>
          {isGroupPhase ? (
            <label className="login__field">
              <span>Jornada (opcional)</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                placeholder="Ej: 1"
                value={round}
                onChange={(e) => setRound(e.target.value)}
              />
            </label>
          ) : (
            <span aria-hidden="true" />
          )}
        </div>
        {outOfRange ? (
          <p className="field-hint">
            La fecha debe estar dentro del torneo: del {formatDateShort(tournament.startDate)} al{' '}
            {formatDateShort(tournament.endDate)}.
          </p>
        ) : (
          <p className="form-dialog__note">
            Entre el {formatDateShort(tournament.startDate)} y el {formatDateShort(tournament.endDate)}, las fechas del
            torneo.
          </p>
        )}
        {!roundValid && <p className="field-hint">La jornada debe ser un número entero entre 1 y 99.</p>}

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
            {saving ? 'Guardando…' : isNew ? 'Programar partido' : 'Guardar partido'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
