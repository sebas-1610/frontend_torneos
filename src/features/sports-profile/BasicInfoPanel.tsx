import { Cake, Footprints, Globe, IdCard, Shirt, type LucideIcon } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { DOCUMENT_TYPES, DOMINANT_FEET, type Player } from '../../api/players'
import { PanelHead } from '../../components/PageHeading'
import { formatDate } from '../../utils/dates'

interface InfoItem {
  icon: LucideIcon
  tone: string // color del cuadro del icono
  label: string
  value: ReactNode
  title?: string
}

// Lo que se muestra en "Información básica". Solo datos que guarda el backend: el mockup también trae
// correo, teléfono y deporte preferido, que no están en ningún anexo.
function itemsOf(player: Player): InfoItem[] {
  const dash = <span className="dash">—</span>
  return [
    {
      icon: IdCard,
      tone: '--tone-blue',
      label: 'Documento',
      value: `${player.documentType} ${player.documentNumber}`,
      title: DOCUMENT_TYPES.find((type) => type.key === player.documentType)?.label,
    },
    { icon: Cake, tone: '--tone-pink', label: 'Fecha de nacimiento', value: formatDate(player.birthDate) },
    { icon: Globe, tone: '--tone-teal', label: 'Nacionalidad', value: player.nationality ?? dash },
    {
      icon: Footprints,
      tone: '--tone-green',
      label: 'Pie dominante',
      value: DOMINANT_FEET.find((foot) => foot.key === player.dominantFoot)?.label ?? dash,
    },
    { icon: Shirt, tone: '--tone-amber', label: 'Posición', value: player.position ?? dash },
  ]
}

// Panel "Información básica": una franja con los datos del jugador, cada uno con su icono.
export function BasicInfoPanel({ player }: { player: Player }) {
  return (
    <section className="panel profile-info" aria-labelledby="profile-info-title">
      <PanelHead icon={IdCard} title="Información básica" titleId="profile-info-title" />
      <ul className="info-strip">
        {itemsOf(player).map(({ icon: Icon, tone, label, value, title }) => (
          <li key={label} className="info-strip__item" title={title}>
            <span className="info-strip__icon" style={{ '--tile': `var(${tone})` } as CSSProperties} aria-hidden="true">
              <Icon size={20} />
            </span>
            <span className="info-strip__text">
              <span className="info-strip__label">{label}</span>
              <span className="info-strip__value">{value}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
