import { ArrowLeft, CalendarDays, CircleAlert, Info, Plus, Search, Shield, Sparkles, Star, Trash2 } from 'lucide-react'
import { useCallback, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { errorMessage } from '../../api/client'
import {
  DEFAULT_LEVEL,
  assignSkill,
  averageLevel,
  changeSkillLevel,
  findSkillsByPlayer,
  removeSkill,
  type PlayerSkill,
} from '../../api/playerSkills'
import { findPlayers, type Player } from '../../api/players'
import { findSkills, type Skill, type SkillSummary } from '../../api/skills'
import { RESOURCES, useAccess } from '../../auth/access'
import { ActionAlert, type ActionError } from '../../components/ActionAlert'
import { SubjectBreak, SubjectVisual } from '../../components/ConfirmDialog'
import { DetailSection, StatTile, StatTiles } from '../../components/DetailPanel'
import { PageHeading, PanelHead } from '../../components/PageHeading'
import { PlayerAvatar } from '../../components/PlayerAvatar'
import { PlayerSearch } from '../../components/PlayerSearch'
import { TeamMonogram } from '../../components/TeamMonogram'
import { useConfirm } from '../../hooks/useConfirm'
import { useLoadList } from '../../hooks/useLoadList'
import { useToast } from '../../hooks/useToast'
import { ageFrom } from '../../utils/dates'
import { plural } from '../../utils/plural'
import { fullNameOf } from '../players/playerName'
import { positionCode, positionColor } from '../players/position'
import { normalize } from '../roles/labels'
import { CATEGORIES, categoryOf } from './categories'
import { SkillIcon } from './SkillIcon'
import { SkillLevelDialog } from './SkillLevelDialog'
import { LevelRing, SkillBars, SkillRadar } from './SkillRadar'
import '../../components/CardGrid.css'
import '../../components/Association.css'
import './PlayerSkillsPage.css'

// La URL dice qué jugador está abierto (#habilidades-jugadores/{id}): al recargar se abre el mismo.
function showPlayerInUrl(playerId: number) {
  window.history.replaceState(null, '', `#habilidades-jugadores/${playerId}`)
}

interface PlayerSkillsPageProps {
  initialPlayerId: number | null // jugador pedido en la URL, por ejemplo desde su detalle en Jugadores
}

// Pantalla "Asignar habilidades" (HU-GD-07): se busca un jugador y se le asignan o retiran
// habilidades, cada una con su nivel. A la izquierda, las disponibles; a la derecha, las que tiene,
// con el radar y el resumen de sus capacidades.
export function PlayerSkillsPage({ initialPlayerId }: PlayerSkillsPageProps) {
  const playersList = useLoadList(findPlayers)
  const skillsList = useLoadList(findSkills)
  const players = playersList.items
  const [playerId, setPlayerId] = useState<number | null>(initialPlayerId)
  const loading = playersList.loading || skillsList.loading
  const loadError = playersList.loadError ?? skillsList.loadError

  // El de la URL; si no hay o ya no existe, el primero activo (o el primero).
  const player =
    players.find((item) => item.id === playerId) ?? players.find((item) => item.active) ?? players[0] ?? null

  if (loadError || loading || !player) {
    return (
      <div className="page page--vivid">
        <PageHeading
          icon={Sparkles}
          title="Asignar habilidades"
          finding={
            loadError
              ? 'No se pudieron cargar los jugadores y las habilidades.'
              : loading
                ? 'Cargando jugadores y habilidades…'
                : 'Todavía no hay jugadores registrados.'
          }
        >
          <BackToSkills />
        </PageHeading>
        <section className="panel" aria-busy={loading}>
          {loadError ? (
            <div className="inline-error" role="alert">
              <CircleAlert size={16} aria-hidden="true" />
              <span>{loadError}</span>
              <button
                type="button"
                className="text-action"
                onClick={() => {
                  playersList.retry()
                  skillsList.retry()
                }}
              >
                Reintentar
              </button>
            </div>
          ) : (
            <p className="empty-state">
              {loading ? 'Cargando jugadores y habilidades…' : 'Primero registra un jugador en la pantalla Jugadores.'}
            </p>
          )}
        </section>
      </div>
    )
  }

  return (
    // La key vuelve a montar todo al cambiar de jugador: carga sus habilidades desde cero.
    <PlayerSkills
      key={player.id}
      player={player}
      players={players}
      skills={skillsList.items}
      onChoosePlayer={(id) => {
        setPlayerId(id)
        showPlayerInUrl(id)
      }}
      onChanged={skillsList.reload} // a cuántos jugadores está asignada cada habilidad
    />
  )
}

function BackToSkills() {
  return (
    <a className="button button--outline" href="#habilidades">
      <ArrowLeft size={18} aria-hidden="true" />
      Volver a Habilidades
    </a>
  )
}

// La ventana del nivel: asignar una habilidad nueva o cambiar el nivel de una que ya tiene.
type LevelTarget = { skill: SkillSummary; currentLevel: number | null }

interface PlayerSkillsProps {
  player: Player
  players: Player[]
  skills: Skill[]
  onChoosePlayer: (playerId: number) => void
  onChanged: () => void
}

function PlayerSkills({ player, players, skills, onChoosePlayer, onChanged }: PlayerSkillsProps) {
  const { can } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const { showToast, toast } = useToast()
  const canAssign = can(RESOURCES.playerSkills, 'CREATE')
  const canChangeLevel = can(RESOURCES.playerSkills, 'UPDATE')
  const canRemove = can(RESOURCES.playerSkills, 'DELETE')

  const fetchOwn = useCallback(() => findSkillsByPlayer(player.id), [player.id])
  const { items: own, loading, loadError, reload, retry } = useLoadList(fetchOwn)
  const [query, setQuery] = useState('')
  const [levelTarget, setLevelTarget] = useState<LevelTarget | null>(null)
  const [busySkillId, setBusySkillId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<ActionError | null>(null)

  const name = fullNameOf(player)
  const [team, ...otherTeams] = player.currentTeams

  // Disponibles: habilidades activas que el jugador todavía no tiene, agrupadas como en Habilidades
  // (por categoría y, dentro, por nombre).
  const free = useMemo(() => {
    const taken = new Set(own.map((skill) => skill.id))
    const order = CATEGORIES.map((category) => category.key)
    return skills
      .filter((skill) => skill.active && !taken.has(skill.id))
      .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.name.localeCompare(b.name, 'es'))
  }, [skills, own])
  const available = useMemo(() => {
    const text = normalize(query.trim())
    return text
      ? free.filter(
          (skill) => normalize(skill.name).includes(text) || normalize(skill.description ?? '').includes(text),
        )
      : free
  }, [free, query])

  const average = averageLevel(own)
  const finding = loading
    ? `Cargando las habilidades de ${name}…`
    : loadError
      ? `No se pudieron cargar las habilidades de ${name}.`
      : own.length === 0
        ? `${name} todavía no tiene habilidades asignadas.`
        : `${name} tiene ${plural(own.length, 'habilidad asignada', 'habilidades asignadas')}, con una media de ${average}.`

  function refresh() {
    reload()
    onChanged()
  }

  // Lo que hace la ventana del nivel al aceptar. Si falla, la ventana muestra el error.
  async function saveLevel(target: LevelTarget, level: number) {
    if (target.currentLevel === null) {
      await assignSkill(player.id, target.skill.id, level)
      showToast(`${target.skill.name} quedó asignada a ${name} con nivel ${level}.`)
    } else {
      await changeSkillLevel(player.id, target.skill.id, level)
      showToast(`${target.skill.name} de ${name} quedó en ${level}.`)
    }
    setLevelTarget(null)
    setActionError(null)
    refresh()
  }

  async function remove(skill: PlayerSkill) {
    const confirmed = await confirm({
      title: `¿Retirar ${skill.name} a ${name}?`,
      message: 'Solo se retira la asignación y su nivel: la habilidad sigue en el catálogo para otros jugadores.',
      confirmLabel: 'Retirar habilidad',
      subject: (
        <>
          <SubjectVisual
            visual={<PlayerAvatar player={player} size="sm" />}
            name={name}
            detail={`${player.documentType} ${player.documentNumber}`}
          />
          <SubjectBreak />
          <SubjectVisual
            visual={<SkillIcon skill={skill} size={18} />}
            name={skill.name}
            detail={`Nivel ${skill.level}`}
          />
        </>
      ),
    })
    if (!confirmed) return
    setBusySkillId(skill.id)
    setActionError(null)
    try {
      await removeSkill(player.id, skill.id)
      showToast(`${skill.name} ya no está asignada a ${name}.`)
    } catch (err) {
      // ej: 404 si otra persona ya la retiró
      setActionError({ title: `No se pudo retirar ${skill.name}`, message: errorMessage(err) })
    } finally {
      setBusySkillId(null)
      refresh()
    }
  }

  return (
    <div className="page page--vivid">
      <PageHeading icon={Sparkles} title="Asignar habilidades" finding={finding}>
        <BackToSkills />
      </PageHeading>

      {/* Buscador y, al lado, el jugador elegido: foto, posición, edad y equipo. */}
      <div className="player-bar">
        <section className="panel player-bar__search" aria-label="Buscar jugador">
          <PlayerSearch
            players={players}
            label="Buscar jugador por nombre o documento"
            onChoose={(chosen) => onChoosePlayer(chosen.id)}
          />
        </section>
        <section className="panel player-bar__card" aria-label="Jugador elegido">
          <PlayerAvatar player={player} size="lg" />
          <div className="player-bar__identity">
            <h2 className="player-bar__name">{name}</h2>
            {player.position ? (
              <p className="hero__role" style={{ '--tag': positionColor(player.position) } as CSSProperties}>
                {positionCode(player.position)} · {player.position}
              </p>
            ) : (
              <p className="detail__meta">Sin posición registrada</p>
            )}
            {!player.active && <span className="pill pill--neutral">Inactivo</span>}
          </div>
          <dl className="player-bar__facts">
            <div>
              <dt>
                <CalendarDays size={14} aria-hidden="true" />
                Edad
              </dt>
              <dd>{plural(ageFrom(player.birthDate), 'año', 'años')}</dd>
            </div>
            <div>
              <dt>
                <Shield size={14} aria-hidden="true" />
                Equipo
              </dt>
              <dd>
                {team ? (
                  <span className="role-cell" title={player.currentTeams.map((item) => item.name).join(', ')}>
                    <TeamMonogram team={team} size="sm" />
                    {team.name}
                    {otherTeams.length > 0 && <span className="sport-stack__more">+{otherTeams.length}</span>}
                  </span>
                ) : (
                  <span className="dash">Sin equipo</span>
                )}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {actionError && <ActionAlert error={actionError} onDismiss={() => setActionError(null)} />}

      {loadError ? (
        <section className="panel">
          <div className="inline-error" role="alert">
            <CircleAlert size={16} aria-hidden="true" />
            <span>{loadError}</span>
            <button type="button" className="text-action" onClick={retry}>
              Reintentar
            </button>
          </div>
        </section>
      ) : loading ? (
        <section className="panel" aria-busy="true">
          <p className="empty-state">Cargando habilidades…</p>
        </section>
      ) : (
        <div className="assoc assoc--wide-right">
          <section className="panel" aria-labelledby="available-skills-title">
            <PanelHead
              icon={Star}
              title="Habilidades disponibles"
              titleId="available-skills-title"
              count={plural(free.length, 'habilidad', 'habilidades')}
            />
            <label className="list-search assoc__search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                placeholder="Buscar habilidades"
                aria-label="Buscar habilidades disponibles"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>

            {!player.active ? (
              <p className="empty-state">{name} está desactivado: actívalo en Jugadores para asignarle habilidades.</p>
            ) : available.length === 0 ? (
              <p className="empty-state">
                {skills.length === 0
                  ? 'El catálogo está vacío. Crea las habilidades en la pantalla Habilidades.'
                  : free.length === 0
                    ? `${name} ya tiene todas las habilidades activas.`
                    : 'Ninguna habilidad disponible coincide con la búsqueda.'}
              </p>
            ) : (
              <ul className="card-grid card-grid--tight">
                {available.map((skill, index) => (
                  <li key={skill.id} className="card-grid__item" style={{ '--i': index } as CSSProperties}>
                    <SkillCard skill={skill}>
                      {canAssign && (
                        <button
                          type="button"
                          className="button button--tint button--tint-green assoc__button"
                          aria-label={`Asignar ${skill.name} a ${name}`}
                          onClick={() => setLevelTarget({ skill, currentLevel: null })}
                        >
                          <Plus size={16} aria-hidden="true" />
                          Asignar
                        </button>
                      )}
                    </SkillCard>
                  </li>
                ))}
              </ul>
            )}
            <p className="assoc__note">
              <Info size={16} aria-hidden="true" />
              Al asignar una habilidad eliges su nivel, de 1 a 100. Las habilidades desactivadas no aparecen aquí.
            </p>
          </section>

          <section className="panel" aria-labelledby="own-skills-title">
            <PanelHead
              icon={Sparkles}
              title="Habilidades del jugador"
              titleId="own-skills-title"
              count={plural(own.length, 'asignada', 'asignadas')}
            />

            {own.length === 0 ? (
              <p className="empty-state">
                {player.active
                  ? 'Asígnale la primera desde la lista de disponibles.'
                  : `${name} no tiene habilidades asignadas.`}
              </p>
            ) : (
              <ul className="card-grid card-grid--tight">
                {own.map((skill, index) => (
                  <li key={skill.id} className="card-grid__item" style={{ '--i': index } as CSSProperties}>
                    <SkillCard
                      skill={skill}
                      level={
                        canChangeLevel ? (
                          <button
                            type="button"
                            className="level-badge level-badge--button"
                            title="Cambiar nivel"
                            aria-label={`Nivel ${skill.level} en ${skill.name}. Cambiar nivel`}
                            disabled={busySkillId !== null}
                            onClick={() => setLevelTarget({ skill, currentLevel: skill.level })}
                          >
                            {skill.level}
                          </button>
                        ) : (
                          <span className="level-badge" title="Nivel">
                            <span className="sr-only">Nivel </span>
                            {skill.level}
                          </span>
                        )
                      }
                    >
                      {canRemove && (
                        <button
                          type="button"
                          className="button button--tint button--tint-red assoc__button"
                          aria-label={`Retirar ${skill.name} a ${name}`}
                          disabled={busySkillId !== null}
                          onClick={() => remove(skill)}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                          {busySkillId === skill.id ? 'Retirando…' : 'Retirar'}
                        </button>
                      )}
                    </SkillCard>
                  </li>
                ))}
              </ul>
            )}
            <p className="assoc__note">
              <Info size={16} aria-hidden="true" />
              Retirar una habilidad solo quita la asignación del jugador: la habilidad sigue en el catálogo para otros
              jugadores.{canChangeLevel && own.length > 0 && ' Para cambiar un nivel, haz clic en su número.'}
            </p>

            {own.length > 0 && (
              <>
                <div className="capacity">
                  <DetailSection title="Radar de capacidades">
                    <SkillRadar skills={own} />
                  </DetailSection>
                  <DetailSection title="Resumen de capacidades">
                    <div className="capacity__summary">
                      <SkillBars skills={own} />
                      <LevelRing value={average} label="Media general" />
                    </div>
                  </DetailSection>
                </div>
                <StatTiles>
                  <StatTile
                    icon={Sparkles}
                    tone="--tone-green"
                    value={own.length}
                    label={own.length === 1 ? 'Habilidad asignada' : 'Habilidades asignadas'}
                  />
                  <StatTile
                    icon={Star}
                    tone="--tone-blue"
                    value={free.length}
                    label={free.length === 1 ? 'Habilidad disponible' : 'Habilidades disponibles'}
                  />
                </StatTiles>
              </>
            )}
          </section>
        </div>
      )}

      {levelTarget && (
        <SkillLevelDialog
          skill={levelTarget.skill}
          playerName={name}
          currentLevel={levelTarget.currentLevel}
          initialLevel={levelTarget.currentLevel ?? DEFAULT_LEVEL}
          onSubmit={(level) => saveLevel(levelTarget, level)}
          onClose={() => setLevelTarget(null)}
        />
      )}
      {confirmDialog}
      {toast}
    </div>
  )
}

interface SkillCardProps {
  skill: SkillSummary
  level?: ReactNode // el número del nivel, arriba a la derecha (solo en las que el jugador tiene)
  children?: ReactNode // el botón: Asignar o Retirar
}

// Tarjeta de una habilidad como en el mockup: su icono en un círculo del color de su categoría, el
// nombre, la categoría, la descripción y su botón.
function SkillCard({ skill, level, children }: SkillCardProps) {
  const category = categoryOf(skill.category)
  const tone = { '--tone': `var(${category.tone})`, '--tag': `var(${category.tone})` } as CSSProperties
  return (
    <article className="entity-card entity-card--center entity-card--static skill-card" style={tone}>
      {level}
      <span className="skill-card__glyph" aria-hidden="true">
        <SkillIcon skill={skill} size={28} />
      </span>
      <h3 className="entity-card__name">{skill.name}</h3>
      <span className="tag">{category.label}</span>
      <p className="entity-card__description">{skill.description ?? 'Sin descripción.'}</p>
      {children}
    </article>
  )
}
