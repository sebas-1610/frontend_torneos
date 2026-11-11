import type { Skill } from '../../api/skills'
import { skillVisual } from './categories'

// Icono de la habilidad en el color de su categoría, con un relleno suave (dos tonos), sin cuadro detrás.
export function SkillIcon({ skill, size = 24 }: { skill: Pick<Skill, 'name' | 'category'>; size?: number }) {
  const { icon: Icon, tone } = skillVisual(skill)
  return (
    <Icon
      size={size}
      strokeWidth={1.8}
      fill="currentColor"
      fillOpacity={0.18}
      style={{ color: `var(${tone})` }}
      aria-hidden="true"
    />
  )
}
