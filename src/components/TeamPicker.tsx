import type { ReactNode } from 'react'
import type { Team } from '../api/teams'
import { TeamMonogram } from './TeamMonogram'
import './TeamPicker.css'

interface TeamPickerProps {
  teams: Team[]
  team: Team // el elegido
  onChoose: (teamId: number) => void
  children?: ReactNode // acción de la pantalla, a la derecha (ej: "Asignar jugador")
}

// Selector de equipo de las pantallas que trabajan sobre un equipo (Asociar deportes, Plantilla): su
// escudo, el desplegable y su ciudad.
export function TeamPicker({ teams, team, onChoose, children }: TeamPickerProps) {
  return (
    <section className="panel team-picker" aria-label="Equipo">
      <TeamMonogram team={team} size="lg" />
      <label className="team-picker__field">
        <span>Equipo</span>
        <select value={team.id} onChange={(e) => onChoose(Number(e.target.value))}>
          {teams.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {item.active ? '' : ' (inactivo)'}
            </option>
          ))}
        </select>
      </label>
      <p className="team-picker__meta">
        {team.city}
        {!team.active && <span className="pill pill--neutral">Inactivo</span>}
      </p>
      {children && <div className="team-picker__actions">{children}</div>}
    </section>
  )
}
