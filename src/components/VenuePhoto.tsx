import type { CSSProperties } from 'react'
import { hueFor } from '../utils/hue'
import { initials } from '../utils/initials'
import './VenuePhoto.css'

interface VenuePhotoProps {
  // Uno de la lista trae su foto (string o null); uno de paso (el de un partido) no la trae.
  venue: { id: number; name: string; photo?: string | null }
  // cover: a todo el ancho, como portada (el detalle de un escenario con foto).
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'cover'
}

// Cómo se ve un escenario en todas las pantallas: su foto apaisada o, si no tiene, sus iniciales sobre
// un tono fijo por id (como los equipos).
export function VenuePhoto({ venue, size = 'md' }: VenuePhotoProps) {
  if (venue.photo) {
    return (
      <span className={`venue-photo venue-photo--${size}`} aria-hidden="true">
        <img src={venue.photo} alt="" />
      </span>
    )
  }
  return (
    <span
      className={`venue-photo venue-photo--${size} venue-photo--empty`}
      style={{ '--hue': hueFor(venue.id) } as CSSProperties}
      aria-hidden="true"
    >
      {initials(venue.name)}
    </span>
  )
}
