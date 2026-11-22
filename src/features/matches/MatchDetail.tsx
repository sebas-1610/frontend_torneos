import { Ban, ClipboardCheck, Info, Pencil, Play, Trash2 } from 'lucide-react'
import type { ReactNode, Ref } from 'react'
import type { Match } from '../../api/matches'
import type { ActionError } from '../../components/ActionAlert'
import { DetailMain, DetailPanel, DetailSide } from '../../components/DetailPanel'
import { MatchBetting, type BettingAbilities } from './MatchBetting'
import { MatchScores, type ScoreAbilities } from './MatchScores'
import { MatchTicketing, type TicketingAbilities } from './MatchTicketing'
import { Scoreboard } from './MatchVisuals'

// Lo que la sesión puede hacer con los partidos; lo decide la pantalla con los permisos.
export interface MatchAbilities {
  start: boolean
  cancel: boolean
  edit: boolean
  remove: boolean
  result: boolean
}

interface MatchDetailProps {
  ref?: Ref<HTMLElement>
  match: Match | null
  emptyMessage: string
  busy: boolean
  error: ActionError | null // la última acción rechazada por el backend
  onDismissError: () => void
  abilities: MatchAbilities
  scoreAbilities: ScoreAbilities
  bettingAbilities: BettingAbilities
  ticketingAbilities: TicketingAbilities
  canOpenVenues: boolean // el escenario del partido lleva a su detalle en Escenarios
  onStart: (match: Match) => void
  onCancel: (match: Match) => void
  onEdit: (match: Match) => void
  onDelete: (match: Match) => void
  onResult: (match: Match) => void
  onScoresChanged: () => void
  onMatchSaved: (match: Match) => void // cambiaron sus cuotas
  onToast: (message: string) => void
  footer?: ReactNode // al final del panel, ej: "Gestionar en su torneo" en la lista general
}

// Panel derecho de Partidos: el marcador del partido elegido (con su escenario), lo que se puede hacer
// según su estado, sus anotaciones (HU-GC-06 y 07), sus cuotas y apuestas (HU-GC-11) y su venta de
// entradas (HU-GE-04).
export function MatchDetail({
  ref,
  match,
  emptyMessage,
  busy,
  error,
  onDismissError,
  abilities,
  scoreAbilities,
  bettingAbilities,
  ticketingAbilities,
  canOpenVenues,
  onStart,
  onCancel,
  onEdit,
  onDelete,
  onResult,
  onScoresChanged,
  onMatchSaved,
  onToast,
  footer,
}: MatchDetailProps) {
  if (!match) {
    return <DetailPanel ref={ref} label="Detalle del partido" icon={Info} emptyMessage={emptyMessage} />
  }

  return (
    <DetailPanel
      ref={ref}
      label="Detalle del partido"
      icon={Info}
      emptyMessage={null}
      error={error}
      onDismissError={onDismissError}
    >
      <DetailMain>
        <Scoreboard match={match} venueHref={canOpenVenues && match.venue ? `#escenarios/${match.venue.id}` : null} />
      </DetailMain>
      <DetailSide>
        {/* La key vuelve a pedir las anotaciones al cambiar de partido. */}
        <MatchScores
          key={match.id}
          match={match}
          abilities={scoreAbilities}
          onChanged={onScoresChanged}
          onToast={onToast}
        />
        {/* HU-GC-11: sus cuotas y sus apuestas. La key vuelve a pedir las apuestas al cambiar de partido. */}
        <MatchBetting
          key={`apuestas-${match.id}`}
          match={match}
          abilities={bettingAbilities}
          onSaved={onMatchSaved}
          onToast={onToast}
        />
        {/* HU-GE-04: la venta de entradas. La key la vuelve a pedir al cambiar de partido, de escenario o de
            estado (cancelarlo anula los boletos). */}
        <MatchTicketing
          key={`entradas-${match.id}-${match.venue?.id ?? 0}-${match.status}`}
          match={match}
          abilities={ticketingAbilities}
          onToast={onToast}
        />
      </DetailSide>
      <MatchActions
        match={match}
        busy={busy}
        abilities={abilities}
        onStart={() => onStart(match)}
        onCancel={() => onCancel(match)}
        onEdit={() => onEdit(match)}
        onDelete={() => onDelete(match)}
        onResult={() => onResult(match)}
      />
      {footer && <div className="detail-cols__actions">{footer}</div>}
    </DetailPanel>
  )
}

interface MatchActionsProps {
  match: Match
  busy: boolean
  abilities: MatchAbilities
  onStart: () => void
  onCancel: () => void
  onEdit: () => void
  onDelete: () => void
  onResult: () => void
}

// Los botones que tiene sentido mostrar en cada estado:
//   Programado → Iniciar · Editar · Cancelar, y aparte Eliminar
//   En juego   → Registrar resultado · Cancelar
//   Finalizado → Corregir resultado
//   Cancelado  → Eliminar
function MatchActions({ match, busy, abilities, onStart, onCancel, onEdit, onDelete, onResult }: MatchActionsProps) {
  const { status } = match
  const start = abilities.start && status === 'PROGRAMADO'
  const edit = abilities.edit && status === 'PROGRAMADO'
  const result = abilities.result && (status === 'EN_JUEGO' || status === 'FINALIZADO')
  const cancel = abilities.cancel && (status === 'PROGRAMADO' || status === 'EN_JUEGO')
  const remove = abilities.remove && (status === 'PROGRAMADO' || status === 'CANCELADO')
  if (!start && !edit && !result && !cancel && !remove) return null

  return (
    <div className="detail-cols__actions">
      {(start || edit || result || cancel) && (
        <div className="detail__actions match-actions">
          {start && (
            <button type="button" className="button button--tint button--tint-green" disabled={busy} onClick={onStart}>
              <Play size={16} aria-hidden="true" />
              Iniciar partido
            </button>
          )}
          {result && (
            <button
              type="button"
              className={`button button--tint ${status === 'EN_JUEGO' ? 'button--tint-green' : 'button--tint-blue'}`}
              disabled={busy}
              onClick={onResult}
            >
              <ClipboardCheck size={16} aria-hidden="true" />
              {status === 'EN_JUEGO' ? 'Registrar resultado' : 'Corregir resultado'}
            </button>
          )}
          {edit && (
            <button type="button" className="button button--tint button--tint-blue" disabled={busy} onClick={onEdit}>
              <Pencil size={16} aria-hidden="true" />
              Editar
            </button>
          )}
          {cancel && (
            <button type="button" className="button button--tint button--tint-red" disabled={busy} onClick={onCancel}>
              <Ban size={16} aria-hidden="true" />
              Cancelar partido
            </button>
          )}
        </div>
      )}
      {/* Lo que borra va aparte, lejos de lo demás. */}
      {remove && (
        <div className="detail__danger">
          <button type="button" className="button button--text row-actions__danger" disabled={busy} onClick={onDelete}>
            <Trash2 size={16} aria-hidden="true" />
            Eliminar partido
          </button>
        </div>
      )}
    </div>
  )
}
