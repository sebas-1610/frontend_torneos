import { useEffect, useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '../../api/client'
import { createSkill, updateSkill, type Skill, type SkillCategory } from '../../api/skills'
import { CATEGORIES } from './categories'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'

interface SkillFormDialogProps {
  skill: Skill | null // null: crear una nueva
  initialCategory: SkillCategory | null // la del filtro, si hay uno elegido
  onClose: () => void
  onSaved: (skill: Skill, isNew: boolean) => void
}

export function SkillFormDialog({ skill, initialCategory, onClose, onSaved }: SkillFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isNew = skill === null
  const [name, setName] = useState(skill?.name ?? '')
  const [category, setCategory] = useState<SkillCategory | ''>(skill?.category ?? initialCategory ?? '')
  const [description, setDescription] = useState(skill?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  // Mismas reglas que valida el backend (CreateSkillDto).
  const trimmedName = name.trim()
  const canSubmit = trimmedName !== '' && trimmedName.length <= 60 && category !== '' && description.length <= 255

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (category === '') return
    setError(null)
    setLoading(true)
    const input = { name: trimmedName, category, description: description.trim() || null }
    try {
      onSaved(isNew ? await createSkill(input) : await updateSkill(skill.id, input), isNew)
    } catch (err) {
      setError(errorMessage(err)) // ej: 409 "Ya existe una habilidad llamada..."
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="form-dialog" onClose={onClose} aria-labelledby="skill-form-title">
      <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
        <h2 id="skill-form-title" className="panel__title">
          {isNew ? 'Nueva habilidad' : 'Editar habilidad'}
        </h2>

        <label className="login__field">
          <span>Nombre</span>
          <input autoComplete="off" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="login__field">
          <span>Categoría</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as SkillCategory | '')}>
            <option value="" disabled>
              Elige una categoría
            </option>
            {CATEGORIES.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="login__field">
          <span>Descripción (opcional)</span>
          <textarea rows={3} maxLength={255} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        {error && (
          <p className="login__error" role="alert">
            {error}
          </p>
        )}

        <div className="form-dialog__actions">
          <button type="button" className="button button--outline" onClick={() => dialogRef.current?.close()}>
            Cancelar
          </button>
          <button type="submit" className="button button--primary" disabled={loading || !canSubmit}>
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
