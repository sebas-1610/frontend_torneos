// Foto de un jugador: el navegador la recorta en cuadrado, la reduce y la entrega como texto
// "data:image/jpeg;base64,...", que es como la recibe y la guarda el backend (CreatePlayerDto.photo).

const SIDE = 256 // píxeles por lado: suficiente para el retrato del detalle y liviana para las listas
const MAX_LENGTH = 90_000 // el mismo límite que valida el backend
const SOURCE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SOURCE_BYTES = 12 * 1024 * 1024

// Lanza un Error con un mensaje para mostrar si el archivo no sirve.
export async function photoFromFile(file: File): Promise<string> {
  if (!SOURCE_TYPES.includes(file.type)) throw new Error('Elige una imagen JPG, PNG o WEBP.')
  if (file.size > MAX_SOURCE_BYTES) throw new Error('La imagen pesa más de 12 MB. Elige una más liviana.')

  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()

    const canvas = document.createElement('canvas')
    canvas.width = SIDE
    canvas.height = SIDE
    const context = canvas.getContext('2d')
    if (!context) throw new Error('sin lienzo')

    // El cuadrado más grande que cabe: centrado a lo ancho y, en una foto vertical, un poco hacia
    // arriba, que es donde suele estar la cara.
    const side = Math.min(image.naturalWidth, image.naturalHeight)
    const left = (image.naturalWidth - side) / 2
    const top = (image.naturalHeight - side) * 0.2
    context.fillStyle = '#202119' // fondo de las imágenes con transparencia (el JPG no la guarda)
    context.fillRect(0, 0, SIDE, SIDE)
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, left, top, side, side, 0, 0, SIDE, SIDE)

    // Si con buena calidad no cabe en el límite, se baja un poco.
    for (const quality of [0.86, 0.72, 0.58]) {
      const photo = canvas.toDataURL('image/jpeg', quality)
      if (photo.length <= MAX_LENGTH) return photo
    }
    throw new Error('muy pesada')
  } catch {
    throw new Error('No se pudo leer la imagen. Prueba con otra.')
  } finally {
    URL.revokeObjectURL(url)
  }
}
