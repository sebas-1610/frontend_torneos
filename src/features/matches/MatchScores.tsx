import { Goal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { errorMessage } from '../../api/client'
import type { Match } from '../../api/matches'
import { deleteScore, findScoresByMatch, type Score } from '../../api/scores'
import { ActionAlert, type ActionError } from '../../components/ActionAlert'
import { SubjectItem } from '../../components/ConfirmDialog'
import { DetailSection } from '../../components/DetailPanel'
import { RowAction } from '../../components/ListView'
import { TeamMonogram } from '../../components/TeamMonogram'
import { useConfirm } from '../../hooks/useConfirm'
import { useLoadList } from '../../hooks/useLoadList'
import { fullNameOf } from '../players/playerName'
import { ScoreFormDialog } from './ScoreFormDialog'

// Lo que la sesión puede hacer con las anotaciones; lo decide la pantalla con los permisos.
export interface ScoreAbilities {
  list: boolean
  create: boolean // también pide listar contratos (para elegir al jugador)
  update: boolean
  remove: boolean
}

interface MatchScoresProps {
  match: Match
  abilities: ScoreAbilities
  onChanged: () => void // cambió lo que suman: el marcador en vivo del partido
  onToast: (message: string) => void
}

// Las anotaciones del partido, por minuto (HU-GC-07). Se registran desde que está en juego; las de un
// partido cancelado solo se pueden eliminar (por ejemplo, para poder eliminar el partido).
export function MatchScores({ match, abilities, onChanged, onToast }: MatchScoresProps) {
  const { confirm, confirmDialog } = useConfirm()
  const fetchScores = useCallback(() => findScoresByMatch(match.id), [match.id])
  const { items: scores, loading, loadError, reload, retry } = useLoadList(fetchScores, abilities.list)
  const [form, setForm] = useState<{ score: Score | null } | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<ActionError | null>(null)

  const playable = match.status === 'EN_JUEGO' || match.status === 'FINALIZADO'
  const canCreate = abilities.create && playable
  const canUpdate = abilities.update && playable

  async function remove(score: Score) {
    const name = fullNameOf(score.player)
    const confirmed = await confirm({
      title: `¿Eliminar la anotación de ${name}?`,
      message: `Lo que suma ${score.team.name} baja ${score.points}. El jugador y el partido no cambian.`,
      confirmLabel: 'Eliminar anotación',
      subject: <SubjectItem icon={Goal} name={`${name} · minuto ${score.minute}`} detail={score.team.name} />,
    })
    if (!confirmed) return
    setBusyId(score.id)
    setActionError(null)
    try {
      await deleteScore(score.id)
      onToast(`Se eliminó la anotación de ${name}.`)
      reload()
      onChanged()
    } catch (err) {
      setActionError({ title: 'No se pudo eliminar la anotación', message: errorMessage(err) })
    } finally {
      setBusyId(null)
    }
  }

  if (!abilities.list) return null

  return (
    <DetailSection
      title="Anotaciones"
      action={
        canCreate && (
          <button
            type="button"
            className="button button--text detail__add detail__add--glow"
            onClick={() => setForm({ score: null })}
          >
            <Plus size={16} aria-hidden="true" />
            Agregar
          </button>
        )
      }
    >
      {actionError && <ActionAlert error={actionError} onDismiss={() => setActionError(null)} />}
      {match.status === 'PROGRAMADO' ? (
        <p className="detail__empty">Las anotaciones se registran desde que el partido está en juego.</p>
      ) : loading ? (
        <p className="detail__empty">Cargando anotaciones…</p>
      ) : loadError ? (
        <p className="detail__empty">
          No se pudieron cargar las anotaciones: {loadError}{' '}
          <button type="button" className="text-action" onClick={retry}>
            Reintentar
          </button>
        </p>
      ) : scores.length === 0 ? (
        <p className="detail__empty">
          {canCreate ? 'Todavía no hay anotaciones: registra la primera con "Agregar".' : 'Este partido no tiene anotaciones.'}
        </p>
      ) : (
        <ul className="score-list" aria-label={`Anotaciones de ${match.homeTeam.name} vs ${match.awayTeam.name}`}>
          {scores.map((score) => (
            <li key={score.id} className={`score-row${score.team.id === match.awayTeam.id ? ' is-away' : ''}`}>
              <span className="score-row__minute">{score.minute}'</span>
              <TeamMonogram team={score.team} size="sm" />
              <span className="score-row__text">
                <span className="score-row__player">{fullNameOf(score.player)}</span>
                <span className="score-row__team">{score.team.name}</span>
              </span>
              <span className="score-row__points">+{score.points}</span>
              {(canUpdate || abilities.remove) && (
                <span className="row-actions">
                  {canUpdate && (
                    <RowAction
                      icon={Pencil}
                      title="Editar anotación"
                      label={`Editar la anotación de ${fullNameOf(score.player)}, minuto ${score.minute}`}
                      disabled={busyId !== null}
                      onClick={() => setForm({ score })}
                    />
                  )}
                  {abilities.remove && (
                    <RowAction
                      icon={Trash2}
                      tone="red"
                      title="Eliminar anotación"
                      label={`Eliminar la anotación de ${fullNameOf(score.player)}, minuto ${score.minute}`}
                      disabled={busyId !== null}
                      onClick={() => remove(score)}
                    />
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {form && (
        <ScoreFormDialog
          match={match}
          score={form.score}
          onClose={() => setForm(null)}
          onSaved={(saved, isNew) => {
            setForm(null)
            setActionError(null)
            onToast(isNew ? `Anotación de ${fullNameOf(saved.player)} registrada.` : 'Cambios guardados.')
            reload()
            onChanged()
          }}
        />
      )}
      {confirmDialog}
    </DetailSection>
  )
}
