// Tipos de los jugadores de ms_torneos_deportiva (HU-GD-04). Las rutas de /players se agregan con
// la pantalla Jugadores; por ahora solo se usa el resumen que llega en otras respuestas.

export type DocumentType = 'CC' | 'TI' | 'CE' | 'PA'

export interface PlayerSummary {
  id: number
  documentType: DocumentType
  documentNumber: string
  firstName: string
  lastName: string
  active: boolean
}
