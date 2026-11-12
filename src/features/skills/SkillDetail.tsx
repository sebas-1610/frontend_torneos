import { CircleAlert, Info, Users } from 'lucide-react'
import { useEffect, useState, type CSSProperties, type Ref } from 'react'
import { errorMessage } from '../../api/client'
import type { PlayerSummary } from '../../api/players'
import { findPlayersBySkill } from '../../api/playerSkills'
import type { Skill } from '../../api/skills'
import type { ActionError } from '../../components/ActionAlert'
import {
  DetailActions,
  DetailHero,
  DetailMain,
  DetailPanel,
  DetailSection,
  DetailSide,
  StatTile,
  StatTiles,
} from '../../components/DetailPanel'
import { PlayerAvatar } from '../../components/PlayerAvatar'
import { categoryOf } from './categories'
import { SkillIcon } from './SkillIcon'

interface SkillDetailProps {
  ref?: Ref<HTMLElement>
  skill: Skill | null // null: no hay habilidades que mostrar
  emptyMessage: string
  busy: boolean
  error: ActionError | null // la última acción rechazada (ej: no se puede eliminar porque está asignada)
  onDismissError: () => void
  canUpdate: boolean
  canDelete: boolean
  canSeePlayers: boolean // asignacion-habilidades · Listar: sin él solo se muestra cuántos jugadores
  onEdit: (skill: Skill) => void
  onToggleActive: (skill: Skill) => void
  onDelete: (skill: Skill) => void
}

// Panel derecho de Habilidades: la habilidad elegida y los jugadores que la tienen (HU-GD-06 y 07).
export function SkillDetail({
  ref,
  skill,
  emptyMessage,
  busy,
  error,
  onDismissError,
  canUpdate,
  canDelete,
  canSeePlayers,
  onEdit,
  onToggleActive,
  onDelete,
}: SkillDetailProps) {
  if (!skill) {
    return <DetailPanel ref={ref} label="Detalle de la habilidad" icon={Info} emptyMessage={emptyMessage} />
  }

  const category = categoryOf(skill.category)
  const players = skill.playersCount
  return (
    <DetailPanel
      ref={ref}
      label="Detalle de la habilidad"
      icon={Info}
      titleId="skill-detail-title"
      emptyMessage={null}
      error={error}
      onDismissError={onDismissError}
    >
      <DetailMain>
        {/* El foco de luz y la etiqueta llevan el color de su categoría. */}
        <DetailHero
          glow={`var(${category.tone})`}
          visual={
            <span className="hero__glyph">
              <SkillIcon skill={skill} size={44} />
            </span>
          }
        >
          <h3 id="skill-detail-title" className="hero__name">
            {skill.name}
          </h3>
          <p className="hero__tags">
            <span className="tag" style={{ '--tag': `var(${category.tone})` } as CSSProperties}>
              {category.label}
            </span>
            <span className={`pill ${skill.active ? 'pill--positive' : 'pill--neutral'}`}>
              <span className="status-dot" aria-hidden="true" />
              {skill.active ? 'Activa' : 'Inactiva'}
            </span>
          </p>
        </DetailHero>

        <StatTiles>
          <StatTile
            icon={Users}
            tone="--tone-blue"
            value={players}
            label={players === 1 ? 'Jugador con esta habilidad' : 'Jugadores con esta habilidad'}
          />
        </StatTiles>
        {!skill.active && (
          <p className="detail__empty detail__note">
            No se puede asignar a más jugadores; los que ya la tienen la conservan.
          </p>
        )}
      </DetailMain>

      <DetailSide>
        <DetailSection title="Descripción">
          <p className="detail-section__text">{skill.description ?? 'Sin descripción.'}</p>
        </DetailSection>

        {canSeePlayers && (
          <DetailSection title="Jugadores con esta habilidad">
            {/* La key vuelve a pedir la lista al cambiar de habilidad o cuando cambia su cantidad de jugadores. */}
            <SkillPlayers key={`${skill.id}:${players}`} skill={skill} />
          </DetailSection>
        )}
      </DetailSide>

      <DetailActions
        noun="habilidad"
        active={skill.active}
        busy={busy}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onEdit={() => onEdit(skill)}
        onToggleActive={() => onToggleActive(skill)}
        onDelete={() => onDelete(skill)}
      />
    </DetailPanel>
  )
}

function SkillPlayers({ skill }: { skill: Skill }) {
  const [players, setPlayers] = useState<PlayerSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    findPlayersBySkill(skill.id)
      .then((list) => {
        if (active) setPlayers(list)
      })
      .catch((err) => {
        if (active) setError(errorMessage(err))
      })
    return () => {
      active = false
    }
  }, [skill.id, attempt])

  if (error) {
    return (
      <div className="inline-error" role="alert">
        <CircleAlert size={16} aria-hidden="true" />
        <span>{error}</span>
        <button
          type="button"
          className="text-action"
          onClick={() => {
            setError(null)
            setAttempt((value) => value + 1)
          }}
        >
          Reintentar
        </button>
      </div>
    )
  }
  if (players === null) {
    return (
      <p className="detail__empty" aria-busy="true">
        Cargando jugadores…
      </p>
    )
  }
  if (players.length === 0) {
    return <p className="detail__empty">Ningún jugador tiene {skill.name} todavía.</p>
  }
  return (
    <ul className="detail-list">
      {players.map((player) => (
        <li key={player.id} className="detail-list__item">
          {/* Esta lista no trae la foto (PlayerSummary): salen las iniciales. */}
          <PlayerAvatar player={player} size="sm" />
          <span className="detail-list__name">
            {player.firstName} {player.lastName}
            <span className="detail-list__detail">
              {player.documentType} {player.documentNumber}
            </span>
          </span>
          {!player.active && <span className="pill pill--neutral">Inactivo</span>}
        </li>
      ))}
    </ul>
  )
}
