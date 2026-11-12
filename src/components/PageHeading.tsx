import type { ComponentType, ReactNode } from 'react'
import './Vivid.css'

// Un icono de lucide o uno propio (BrandIcons) que acepte el tamaño.
export type IconType = ComponentType<{ size?: number }>

interface PageHeadingProps {
  icon: IconType // el mismo icono de la sección en el menú
  title: string
  finding: string // la frase con los datos de hoy
  children?: ReactNode // acción a la derecha (ej: "Volver a Equipos")
}

// Encabezado de las pantallas de Gestión deportiva: el icono de la sección en un cuadro dorado, el
// título y la frase del día. La pantalla debe llevar la clase page--vivid en su raíz.
export function PageHeading({ icon: Icon, title, finding, children }: PageHeadingProps) {
  return (
    <div className={`page__head${children ? ' list-head' : ''}`}>
      <div className="page__heading">
        <span className="page__icon" aria-hidden="true">
          <Icon size={22} />
        </span>
        <div>
          <h1 className="page__title">{title}</h1>
          <p className="page__finding">{finding}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

interface PanelHeadProps {
  icon: IconType
  title: string
  titleId?: string // para el aria-labelledby del panel
  count?: string | null // ej: "5 equipos"
}

// Título de un panel con su icono en un cuadro de color y, si aplica, cuántos elementos tiene.
export function PanelHead({ icon: Icon, title, titleId, count }: PanelHeadProps) {
  return (
    <div className="panel-head">
      <span className="panel-head__icon" aria-hidden="true">
        <Icon size={16} />
      </span>
      <h2 id={titleId} className="panel__title">
        {title}
      </h2>
      {count && <span className="count-chip">{count}</span>}
    </div>
  )
}
