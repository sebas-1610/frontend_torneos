import { CircleAlert, Sparkles } from 'lucide-react'
import { useCallback } from 'react'
import { averageLevel } from '../../api/playerSkills'
import { RESOURCES, useAccess } from '../../auth/access'
import { useLoad } from '../../hooks/useLoad'
import { AttributesPanel } from './AttributesPanel'
import { BasicInfoPanel } from './BasicInfoPanel'
import { ProfileCard } from './ProfileCard'
import type { SportsProfileSource } from './profileSource'
import { SkillsPanel } from './SkillsPanel'
import { TeamsPanel } from './TeamsPanel'

interface ProfileViewProps {
  source: SportsProfileSource
  playerId: number
}

// El perfil de un jugador: lo carga y reparte cada parte a su panel. No dibuja nada propio: cada
// panel sabe mostrar una sola cosa (la tarjeta, los atributos, los equipos, las habilidades, la
// información básica) y recibe solo los datos que necesita.
export function ProfileView({ source, playerId }: ProfileViewProps) {
  const { can } = useAccess()
  const canManageSkills =
    can(RESOURCES.playerSkills, 'LIST') && can(RESOURCES.skills, 'LIST') && can(RESOURCES.players, 'LIST')

  const fetchProfile = useCallback(() => source.findProfile(playerId), [source, playerId])
  const { data: profile, loading, loadError, retry } = useLoad(fetchProfile)

  if (loadError) {
    return (
      <section className="panel">
        <div className="inline-error" role="alert">
          <CircleAlert size={16} aria-hidden="true" />
          <span>{loadError}</span>
          <button type="button" className="text-action" onClick={retry}>
            Reintentar
          </button>
        </div>
      </section>
    )
  }
  if (loading || !profile) {
    return (
      <section className="panel" aria-busy="true">
        <p className="empty-state">Cargando el perfil deportivo…</p>
      </section>
    )
  }

  const { player, skills } = profile
  // El equipo de la insignia de la foto: el primero con contrato vigente.
  const currentTeam = profile.teams.find((contract) => contract.status === 'VIGENTE')?.team ?? null

  return (
    <div className="profile-grid">
      <ProfileCard
        player={player}
        currentTeam={currentTeam}
        average={skills.length > 0 ? averageLevel(skills) : null}
      />
      <AttributesPanel skills={skills} emptyText={profile.skillsMessage} />
      <div className="profile-grid__side">
        <TeamsPanel teams={profile.teams} history={profile.teamHistory} emptyText={profile.teamsMessage} />
        <SkillsPanel
          skills={skills}
          emptyText={profile.skillsMessage}
          action={
            canManageSkills && (
              <a className="button button--text detail__add" href={`#habilidades-jugadores/${player.id}`}>
                <Sparkles size={16} aria-hidden="true" />
                Gestionar
              </a>
            )
          }
        />
      </div>
      <BasicInfoPanel player={player} />
    </div>
  )
}
