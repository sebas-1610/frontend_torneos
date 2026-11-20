import type { ReactNode } from 'react'
import type { Sport } from '../api/sports'
import type { Tournament, TournamentStatus } from '../api/tournaments'
import { kindOfSummary } from '../features/sports/sportKind'
import { TournamentStatusTag } from '../features/tournaments/TournamentStatusTag'
import { categoryLabel } from '../features/tournaments/tournamentInfo'
import { SportIcon } from './SportIcon'
import { TournamentBadge } from './TournamentBadge'
import './TeamPicker.css'

interface TournamentPickerProps {
  tournaments: Tournament[]
  tournament: Tournament // el elegido
  sports: Sport[] // para el balón del deporte (vacía si la sesión no puede listar deportes)
  onChoose: (tournamentId: number) => void
  // Lo que importa en la pantalla: si recibe inscripciones (Inscripciones) o en qué va (Fases y grupos).
  groupBy?: 'registration' | 'status'
  children?: ReactNode // acción de la pantalla, a la derecha
}

// En la lista por estado: primero los que se están jugando.
const STATUS_GROUPS: { status: TournamentStatus; label: string }[] = [
  { status: 'EN_CURSO', label: 'En curso' },
  { status: 'POR_INICIAR', label: 'Por iniciar' },
  { status: 'FINALIZADO', label: 'Finalizados' },
]

// Selector de torneo de las pantallas que trabajan sobre un torneo (Inscripciones, Fases y grupos): su
// trofeo, el desplegable y su deporte, categoría y lo que importa en esa pantalla. Usa las mismas clases
// del selector de equipo (TeamPicker).
export function TournamentPicker({
  tournaments,
  tournament,
  sports,
  onChoose,
  groupBy = 'registration',
  children,
}: TournamentPickerProps) {
  const option = (item: Tournament) => (
    <option key={item.id} value={item.id}>
      {item.name}
      {item.active ? '' : ' (inactivo)'}
    </option>
  )
  const groups =
    groupBy === 'status'
      ? STATUS_GROUPS.map(({ status, label }) => ({
          label,
          items: tournaments.filter((item) => item.status === status),
        }))
      : [
          { label: 'Inscripciones abiertas', items: tournaments.filter((item) => item.registrationOpen) },
          { label: 'Inscripciones cerradas', items: tournaments.filter((item) => !item.registrationOpen) },
        ]

  return (
    <section className="panel team-picker" aria-label="Torneo">
      <TournamentBadge tournament={tournament} size="lg" />
      <label className="team-picker__field">
        <span>Torneo</span>
        <select value={tournament.id} onChange={(e) => onChoose(Number(e.target.value))}>
          {groups
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.items.map(option)}
              </optgroup>
            ))}
        </select>
      </label>
      <p className="team-picker__meta">
        <SportIcon kind={kindOfSummary(tournament.sport, sports)} id={tournament.sport.id} size={18} />
        {tournament.sport.name} · {categoryLabel(tournament.category)}
        {groupBy === 'status' ? (
          <TournamentStatusTag tournament={tournament} />
        ) : (
          <span className={`pill ${tournament.registrationOpen ? 'pill--positive' : 'pill--neutral'}`}>
            <span className="status-dot" aria-hidden="true" />
            {tournament.registrationOpen ? 'Inscripciones abiertas' : 'Inscripciones cerradas'}
          </span>
        )}
      </p>
      {children && <div className="team-picker__actions">{children}</div>}
    </section>
  )
}
