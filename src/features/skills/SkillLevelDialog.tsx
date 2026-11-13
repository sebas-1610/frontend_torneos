import { Gauge, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '../../api/client'
import { MAX_LEVEL, MIN_LEVEL } from '../../api/playerSkills'
import type { SkillSummary } from '../../api/skills'
import { SubjectVisual } from '../../components/ConfirmDialog'
import { categoryOf } from './categories'
import { SkillIcon } from './SkillIcon'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'
import '../../components/ConfirmDialog.css'

interface SkillLevelDialogProps {
  skill: SkillSummary
  playerName: string
  currentLevel: number | null // null: la habilidad se está asignando; un número: se cambia su nivel
  initialLevel: number
  onSubmit: (level: number) => Promise<void> // asigna o cambia el nivel; si falla, el error sale aquí
  onClose: () => void
}

// Qué significa el número, para que dos personas no califiquen distinto lo mismo.
function levelWord(level: number): string {
  if (level >= 90) return 'Sobresaliente'
  if (level >= 75) return 'Alto'
  if (level >= 50) return 'Medio'
  if (level >= 25) return 'Básico'
  return 'Inicial'
}

// Ventana para decir qué nivel (1–100) tiene el jugador en una habilidad, al asignarla o después.
// El nivel es el dato que dibuja el radar de capacidades.
export function SkillLevelDialog({
  skill,
  playerName,
  currentLevel,
  initialLevel,
  onSubmit,
  onClose,
}: SkillLevelDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isNew = currentLevel === null
  const [text, setText] = useState(String(initialLevel))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const level = Number(text)
  const valid = text.trim() !== '' && Number.isInteger(level) && level >= MIN_LEVEL && level <= MAX_LEVEL

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!valid) return
    setError(null)
    setLoading(true)
    try {
      await onSubmit(level)
    } catch (err) {
      setError(errorMessage(err)) // ej: 409 si otra persona ya se la asignó
      setLoading(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="form-dialog" onClose={onClose} aria-labelledby="level-title">
      <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
        <div className="form-dialog__head">
          <span className="panel-head__icon" aria-hidden="true">
            <Gauge size={16} />
          </span>
          <h2 id="level-title" className="panel__title">
            {isNew ? `Asignar ${skill.name}` : `Cambiar el nivel de ${skill.name}`}
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

        <div className="confirm-dialog__subject">
          <SubjectVisual
            visual={<SkillIcon skill={skill} size={18} />}
            name={skill.name}
            detail={`Habilidad ${categoryOf(skill.category).label.toLowerCase()} · ${playerName}`}
          />
        </div>

        <div className="login__field">
          <label htmlFor="level-range">Nivel de {playerName} en esta habilidad</label>
          <div className="level-field">
            <input
              id="level-range"
              type="range"
              min={MIN_LEVEL}
              max={MAX_LEVEL}
              value={valid ? level : MIN_LEVEL}
              onChange={(e) => setText(e.target.value)}
            />
            <input
              className="level-field__number"
              type="number"
              inputMode="numeric"
              min={MIN_LEVEL}
              max={MAX_LEVEL}
              aria-label="Nivel, de 1 a 100"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <p className={valid ? 'level-field__hint' : 'field-hint'}>
            {valid
              ? `${levelWord(level)}. 1 es lo más bajo y 100 lo más alto.` +
                (currentLevel !== null && currentLevel !== level ? ` Hoy tiene ${currentLevel}.` : '')
              : 'El nivel debe ser un número entero entre 1 y 100.'}
          </p>
        </div>

        {error && (
          <p className="login__error" role="alert">
            {error}
          </p>
        )}

        <div className="form-dialog__actions">
          <button type="button" className="button button--outline" onClick={() => dialogRef.current?.close()}>
            Cancelar
          </button>
          <button
            type="submit"
            className="button button--primary"
            disabled={loading || !valid || currentLevel === level}
          >
            {loading ? 'Guardando…' : isNew ? 'Asignar habilidad' : 'Guardar nivel'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
