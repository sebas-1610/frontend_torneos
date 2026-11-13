import { Star } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import type { PlayerSkill } from '../../api/playerSkills'
import { PanelHead } from '../../components/PageHeading'
import { categoryOf } from '../skills/categories'
import { SkillIcon } from '../skills/SkillIcon'

interface SkillsPanelProps {
  skills: PlayerSkill[]
  emptyText: string | null // el mensaje del backend si no tiene habilidades
  action?: ReactNode // ej: "Gestionar", si la sesión puede asignar habilidades
}

// Panel "Habilidades": cada habilidad del jugador con su icono y su nivel, de la más alta a la más baja.
export function SkillsPanel({ skills, emptyText, action }: SkillsPanelProps) {
  const ordered = [...skills].sort((a, b) => b.level - a.level || a.name.localeCompare(b.name, 'es'))
  return (
    <section className="panel" aria-labelledby="profile-skills-title">
      <PanelHead icon={Star} title="Habilidades" titleId="profile-skills-title" action={action} />
      {ordered.length === 0 ? (
        <p className="detail__empty">{emptyText}</p>
      ) : (
        <ul className="skill-chips">
          {ordered.map((skill) => (
            <li
              key={skill.id}
              className="skill-chips__item"
              title={`${skill.name} · ${categoryOf(skill.category).label} · nivel ${skill.level}`}
              style={{ '--tone': `var(${categoryOf(skill.category).tone})` } as CSSProperties}
            >
              <SkillIcon skill={skill} size={18} />
              <span className="skill-chips__name">{skill.name}</span>
              <span className="skill-chips__level num">{skill.level}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
