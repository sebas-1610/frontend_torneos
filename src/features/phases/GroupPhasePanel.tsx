import { CircleAlert, Grid2x2, Info, Medal, Plus, Users } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { errorMessage } from '../../api/client'
import { removeTeamFromGroup } from '../../api/groupTeams'
import { deleteGroup, findGroupsByPhase, type Group } from '../../api/groups'
import type { Phase } from '../../api/phases'
import type { TeamSummary } from '../../api/teams'
import type { Registration } from '../../api/tournamentTeams'
import { ActionAlert, type ActionError } from '../../components/ActionAlert'
import { SubjectBreak, SubjectItem, SubjectVisual } from '../../components/ConfirmDialog'
import { DetailSection, StatTile, StatTiles } from '../../components/DetailPanel'
import { TeamMonogram } from '../../components/TeamMonogram'
import { useConfirm } from '../../hooks/useConfirm'
import { useLoadList } from '../../hooks/useLoadList'
import { plural } from '../../utils/plural'
import { AssignTeamsDialog } from './AssignTeamsDialog'
import { GroupCard } from './GroupCard'
import { GroupFormDialog } from './GroupFormDialog'
import { DEFAULT_QUALIFIERS, nextGroupName } from './phaseInfo'

// Lo que la sesión puede hacer con los grupos; lo decide TournamentPhases con los permisos y el estado
// del torneo.
export interface GroupAbilities {
  list: boolean
  create: boolean
  rename: boolean
  remove: boolean
  assign: boolean
  removeTeam: boolean
}

interface GroupPhasePanelProps {
  phase: Phase
  head: ReactNode // PhaseHead: nombre, tipo y acciones
  titleId: string
  registrations: Registration[] | null // null: no se pueden ver los inscritos (sin permiso o sin cargar)
  abilities: GroupAbilities
  onGroupsChanged: () => void // se creó o se eliminó un grupo: la lista de fases cuenta sus grupos
  onToast: (message: string) => void
}

// Por nombre, como los devuelve el backend.
function byName(a: Group, b: Group): number {
  return a.name.localeCompare(b.name, 'es')
}

// Una fase de grupos (HU-GC-04): sus cifras, sus grupos con los equipos de cada uno y los inscritos que
// todavía no tienen grupo. Carga los grupos de la fase y maneja sus acciones.
export function GroupPhasePanel({
  phase,
  head,
  titleId,
  registrations,
  abilities,
  onGroupsChanged,
  onToast,
}: GroupPhasePanelProps) {
  const { confirm, confirmDialog } = useConfirm()
  const fetchGroups = useCallback(() => findGroupsByPhase(phase.id), [phase.id])
  const { items: groups, setItems, loading, loadError, reload, retry } = useLoadList(fetchGroups, abilities.list)
  const [form, setForm] = useState<{ group: Group | null } | null>(null)
  const [assigning, setAssigning] = useState<Group | null>(null)
  const [busy, setBusy] = useState(false)
  const [busyTeamId, setBusyTeamId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<ActionError | null>(null)

  const ready = abilities.list && !loading && !loadError
  const groupsCount = ready ? groups.length : (phase.groupsCount ?? 0)
  const qualifiers = phase.qualifiersPerGroup ?? DEFAULT_QUALIFIERS
  const inGroups = useMemo(() => new Set(groups.flatMap((group) => group.teams.map((team) => team.id))), [groups])
  // Inscritos que todavía no están en ningún grupo de esta fase; solo los activos se pueden asignar.
  const withoutGroup = useMemo(
    () => (ready && registrations ? registrations.map(({ team }) => team).filter((team) => !inGroups.has(team.id)) : null),
    [ready, registrations, inGroups],
  )
  const candidates = withoutGroup?.filter((team) => team.active) ?? []

  function saveGroup(group: Group) {
    setItems((current) => [...current.filter((item) => item.id !== group.id), group].sort(byName))
  }

  async function removeGroup(group: Group) {
    const confirmed = await confirm({
      title: `¿Eliminar ${group.name}?`,
      message:
        'Sus equipos salen del grupo, pero siguen inscritos en el torneo y registrados en la plataforma. ' +
        'Un grupo cuyos equipos ya tienen partidos en la fase no se puede eliminar.',
      confirmLabel: 'Eliminar grupo',
      subject: (
        <SubjectItem icon={Grid2x2} name={group.name} detail={`${phase.name} · ${plural(group.teamsCount, 'equipo', 'equipos')}`} />
      ),
    })
    if (!confirmed) return
    setBusy(true)
    setActionError(null)
    try {
      await deleteGroup(group.id)
      setItems((current) => current.filter((item) => item.id !== group.id))
      onToast(`Se eliminó ${group.name}.`)
      onGroupsChanged()
    } catch (err) {
      setActionError({ title: `No se pudo eliminar ${group.name}`, message: errorMessage(err) })
      reload()
    } finally {
      setBusy(false)
    }
  }

  async function removeTeam(group: Group, team: TeamSummary) {
    const confirmed = await confirm({
      title: `¿Sacar a ${team.name} de ${group.name}?`,
      message: 'El equipo sigue inscrito en el torneo y puede entrar a otro grupo de esta fase.',
      confirmLabel: 'Sacar del grupo',
      subject: (
        <>
          <SubjectVisual visual={<TeamMonogram team={team} size="sm" />} name={team.name} detail="Equipo" />
          <SubjectBreak />
          <SubjectItem icon={Grid2x2} name={group.name} detail={phase.name} />
        </>
      ),
    })
    if (!confirmed) return
    setBusy(true)
    setBusyTeamId(team.id)
    setActionError(null)
    try {
      await removeTeamFromGroup(group.id, team.id)
      saveGroup({
        ...group,
        teams: group.teams.filter((item) => item.id !== team.id),
        teamsCount: group.teamsCount - 1,
      })
      onToast(`${team.name} ya no está en ${group.name}.`)
    } catch (err) {
      // ej: 400 si el equipo ya tiene partidos en la fase
      setActionError({ title: `No se pudo sacar a ${team.name}`, message: errorMessage(err) })
      reload()
    } finally {
      setBusy(false)
      setBusyTeamId(null)
    }
  }

  return (
    <section className="panel phase-panel" aria-labelledby={titleId} aria-busy={loading}>
      {head}
      {actionError && <ActionAlert error={actionError} onDismiss={() => setActionError(null)} />}

      <StatTiles>
        <StatTile icon={Grid2x2} tone="--tone-teal" value={groupsCount} label={groupsCount === 1 ? 'Grupo' : 'Grupos'} />
        {ready && (
          <StatTile
            icon={Users}
            tone="--tone-blue"
            value={inGroups.size}
            label={inGroups.size === 1 ? 'Equipo en grupos' : 'Equipos en grupos'}
          />
        )}
        <StatTile
          icon={Medal}
          tone="--tone-amber"
          value={groupsCount * qualifiers}
          label={`${groupsCount * qualifiers === 1 ? 'Pasa' : 'Pasan'} a la siguiente fase (${qualifiers} por grupo)`}
        />
      </StatTiles>

      {abilities.list && (
        <DetailSection
          title="Grupos"
          action={
            abilities.create && (
              <button
                type="button"
                className="button button--text detail__add detail__add--glow"
                disabled={busy}
                onClick={() => setForm({ group: null })}
              >
                <Plus size={16} aria-hidden="true" />
                Nuevo grupo
              </button>
            )
          }
        >
          {loadError ? (
            <div className="inline-error" role="alert">
              <CircleAlert size={16} aria-hidden="true" />
              <span>{loadError}</span>
              <button type="button" className="text-action" onClick={retry}>
                Reintentar
              </button>
            </div>
          ) : loading ? (
            <p className="empty-state">Cargando grupos…</p>
          ) : groups.length === 0 ? (
            <p className="empty-state">
              {abilities.create
                ? `${phase.name} todavía no tiene grupos. Crea el primero con "Nuevo grupo".`
                : `${phase.name} todavía no tiene grupos.`}
            </p>
          ) : (
            <ul className="group-grid" aria-label={`Grupos de ${phase.name}`}>
              {groups.map((group, index) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  index={index}
                  busy={busy}
                  busyTeamId={busyTeamId}
                  onRename={abilities.rename ? () => setForm({ group }) : undefined}
                  onDelete={abilities.remove ? () => removeGroup(group) : undefined}
                  onAssign={abilities.assign && candidates.length > 0 ? () => setAssigning(group) : undefined}
                  onRemoveTeam={abilities.removeTeam ? (team) => removeTeam(group, team) : undefined}
                />
              ))}
            </ul>
          )}
        </DetailSection>
      )}

      {withoutGroup && (
        <DetailSection title="Inscritos sin grupo">
          {registrations?.length === 0 ? (
            <p className="detail__empty">El torneo todavía no tiene equipos inscritos: inscríbelos en Inscripciones.</p>
          ) : withoutGroup.length === 0 ? (
            <p className="detail__empty">Todos los equipos inscritos ya tienen grupo en esta fase.</p>
          ) : (
            <ul className="chip-list">
              {withoutGroup.map((team) => (
                <li key={team.id} className={`chip${team.active ? '' : ' is-inactive'}`}>
                  <TeamMonogram team={team} size="sm" />
                  {team.name}
                  {!team.active && <span className="chip__detail">desactivado</span>}
                </li>
              ))}
            </ul>
          )}
        </DetailSection>
      )}

      <p className="assoc__note">
        <Info size={16} aria-hidden="true" />
        Un equipo está en un solo grupo por fase y debe estar inscrito en el torneo. Sacarlo de un grupo o
        eliminar el grupo no borra el equipo.
      </p>

      {form && (
        <GroupFormDialog
          phase={phase}
          group={form.group}
          suggestedName={nextGroupName(groups)}
          onClose={() => setForm(null)}
          onSaved={(saved, isNew) => {
            setForm(null)
            saveGroup(saved)
            onToast(isNew ? `Se creó ${saved.name}.` : 'Cambios guardados.')
            if (isNew) onGroupsChanged()
          }}
        />
      )}
      {assigning && (
        <AssignTeamsDialog
          group={assigning}
          candidates={candidates}
          onClose={() => setAssigning(null)}
          onAssigned={(saved, count) => {
            setAssigning(null)
            saveGroup(saved)
            onToast(count === 1 ? `Se asignó 1 equipo a ${saved.name}.` : `Se asignaron ${count} equipos a ${saved.name}.`)
          }}
        />
      )}
      {confirmDialog}
    </section>
  )
}
