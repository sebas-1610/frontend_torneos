import { Radar } from 'lucide-react'
import { useState } from 'react'
import { averageLevel, type PlayerSkill } from '../../api/playerSkills'
import type { SkillCategory } from '../../api/skills'
import { PanelHead } from '../../components/PageHeading'
import { CATEGORIES } from '../skills/categories'
import { SkillRadar } from '../skills/SkillRadar'

interface AttributesPanelProps {
  skills: PlayerSkill[]
  emptyText: string | null // el mensaje del backend si no tiene habilidades
}

// Panel "Atributos": el radar con el nivel de cada habilidad. Como en el mockup, un selector cambia la
// vista: todas ("General") o solo las de una categoría.
export function AttributesPanel({ skills, emptyText }: AttributesPanelProps) {
  const [view, setView] = useState<SkillCategory | ''>('')
  // Solo se ofrecen las categorías en las que el jugador tiene habilidades.
  const categories = CATEGORIES.filter((category) => skills.some((skill) => skill.category === category.key))
  const shown = view ? skills.filter((skill) => skill.category === view) : skills
  const viewLabel = CATEGORIES.find((category) => category.key === view)?.label.toLowerCase()

  return (
    <section className="panel profile-attributes" aria-labelledby="profile-attributes-title">
      <PanelHead
        icon={Radar}
        title="Atributos"
        titleId="profile-attributes-title"
        action={
          categories.length > 1 && (
            <select
              className="profile-attributes__view"
              aria-label="Vista del radar"
              value={view}
              onChange={(e) => setView(e.target.value as SkillCategory | '')}
            >
              <option value="">General</option>
              {categories.map((category) => (
                <option key={category.key} value={category.key}>
                  {category.label}
                </option>
              ))}
            </select>
          )
        }
      />

      {skills.length === 0 ? (
        <p className="empty-state">{emptyText ?? 'El jugador no tiene habilidades registradas.'}</p>
      ) : (
        <>
          <SkillRadar
            skills={shown}
            showValues
            emptyText={
              view
                ? `Tiene ${shown.length === 1 ? 'una sola habilidad' : `${shown.length} habilidades`} ${viewLabel}: ` +
                  'el radar necesita al menos 3. Mira la vista General.'
                : undefined
            }
          />
          <p className="profile-attributes__legend">
            <span className="profile-attributes__swatch" aria-hidden="true" />
            Nivel del jugador, de 1 a 100
            <span className="profile-attributes__average">
              Media {view ? viewLabel : 'general'}: <strong className="num">{averageLevel(shown)}</strong>
            </span>
          </p>
        </>
      )}
    </section>
  )
}
