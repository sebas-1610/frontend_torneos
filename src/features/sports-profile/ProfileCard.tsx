import { CalendarDays, Globe, Ruler } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { Player } from '../../api/players'
import type { TeamSummary } from '../../api/teams'
import { AnimatedNumber } from '../../components/AnimatedNumber'
import { StatusPill } from '../../components/ListView'
import { PlayerAvatar } from '../../components/PlayerAvatar'
import { TeamMonogram } from '../../components/TeamMonogram'
import { ageFrom } from '../../utils/dates'
import { hueFor } from '../../utils/hue'
import { plural } from '../../utils/plural'
import { positionCode, positionColor } from '../players/position'

interface ProfileCardProps {
  player: Player
  currentTeam: TeamSummary | null // el de la insignia sobre la foto y el color de la luz
  average: number | null // media de sus habilidades; null si no tiene ninguna
}

// Tarjeta del jugador, como la del mockup: su media y su posición, la foto con la insignia de su
// equipo, el nombre y tres datos (edad, estatura, estado).
export function ProfileCard({ player, currentTeam, average }: ProfileCardProps) {
  const glow = `hsl(${hueFor(currentTeam?.id ?? player.id)} 65% 48%)`
  const age = ageFrom(player.birthDate)
  return (
    <section
      className="panel profile-card"
      style={{ '--glow': glow } as CSSProperties}
      aria-labelledby="profile-card-name"
    >
      <div className="profile-card__top">
        <div className="profile-card__rating">
          {average === null ? (
            <span className="profile-card__overall profile-card__overall--empty" title="Sin habilidades registradas">
              —
            </span>
          ) : (
            <AnimatedNumber value={average} className="profile-card__overall" />
          )}
          <span className="profile-card__overall-label">Media general</span>
          {player.position ? (
            <span
              className="profile-card__position"
              title={player.position}
              style={{ '--tag': positionColor(player.position) } as CSSProperties}
            >
              {positionCode(player.position)}
            </span>
          ) : (
            <span className="profile-card__position profile-card__position--none">Sin posición</span>
          )}
          <span className="profile-card__nation">
            <Globe size={16} aria-hidden="true" />
            {player.nationality ?? 'Nacionalidad sin registrar'}
          </span>
        </div>
        <span className="hero__portrait">
          <PlayerAvatar player={player} size="portrait" />
          {currentTeam && (
            <span className="hero__badge" title={currentTeam.name}>
              <TeamMonogram team={currentTeam} size="md" />
            </span>
          )}
        </span>
      </div>

      <h2 id="profile-card-name" className="profile-card__name">
        <span>{player.firstName}</span>
        <strong>{player.lastName}</strong>
      </h2>

      <dl className="profile-card__stats">
        <div>
          <dt>
            <CalendarDays size={14} aria-hidden="true" />
            Edad
          </dt>
          <dd className="num">{plural(age, 'año', 'años')}</dd>
        </div>
        <div>
          <dt>
            <Ruler size={14} aria-hidden="true" />
            Altura
          </dt>
          <dd className="num">
            {player.heightCm ? (
              `${(player.heightCm / 100).toFixed(2).replace('.', ',')} m`
            ) : (
              <span className="dash">—</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>
            <StatusPill active={player.active} />
          </dd>
        </div>
      </dl>
    </section>
  )
}
