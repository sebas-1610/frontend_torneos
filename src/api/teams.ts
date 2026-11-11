// Tipos de los equipos de ms_torneos_deportiva (HU-GD-02). Las rutas de /teams se agregan con la
// pantalla Equipos; por ahora solo se usa el resumen que llega en otras respuestas.

export interface TeamSummary {
  id: number
  name: string
  active: boolean
}
