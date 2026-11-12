// Imágenes que se guardan junto a su dueño: la foto de un jugador y el escudo de un equipo. El
// navegador las reduce y las entrega como texto "data:image/...;base64,...", que es como las recibe
// y las guarda el backend (common/validation/image.ts).

const MAX_LENGTH = 90_000 // el mismo límite que valida el backend
const SOURCE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SOURCE_BYTES = 12 * 1024 * 1024

const PHOTO_SIDE = 256 // píxeles por lado: suficiente para el retrato del detalle y liviana para las listas
const SHIELD_SIDE = 192 // el escudo más grande se ve a 72 px; 192 se ve nítido en pantallas densas

// Foto de un jugador: se recorta en cuadrado y se guarda como JPG.
// Lanza un Error con un mensaje para mostrar si el archivo no sirve.
export async function photoFromFile(file: File): Promise<string> {
  return drawFile(file, PHOTO_SIDE, (context, image) => {
    // El cuadrado más grande que cabe: centrado a lo ancho y, en una foto vertical, un poco hacia
    // arriba, que es donde suele estar la cara.
    const side = Math.min(image.naturalWidth, image.naturalHeight)
    const left = (image.naturalWidth - side) / 2
    const top = (image.naturalHeight - side) * 0.2
    context.fillStyle = '#202119' // fondo de las imágenes con transparencia (el JPG no la guarda)
    context.fillRect(0, 0, PHOTO_SIDE, PHOTO_SIDE)
    context.drawImage(image, left, top, side, side, 0, 0, PHOTO_SIDE, PHOTO_SIDE)

    // Si con buena calidad no cabe en el límite, se baja un poco.
    return [0.86, 0.72, 0.58].map((quality) => context.canvas.toDataURL('image/jpeg', quality))
  })
}

// Escudo de un equipo: entero (sin recortar), centrado en un cuadrado y con su fondo transparente.
// Se guarda como WEBP, que conserva la transparencia y pesa poco; si el navegador no sabe crear
// WEBP (Safari), como PNG.
export async function shieldFromFile(file: File): Promise<string> {
  return drawFile(file, SHIELD_SIDE, (context, image) => {
    const scale = SHIELD_SIDE / Math.max(image.naturalWidth, image.naturalHeight)
    const width = image.naturalWidth * scale
    const height = image.naturalHeight * scale
    context.drawImage(image, (SHIELD_SIDE - width) / 2, (SHIELD_SIDE - height) / 2, width, height)

    const webp = [0.9, 0.78, 0.64]
      .map((quality) => context.canvas.toDataURL('image/webp', quality))
      .filter((url) => url.startsWith('data:image/webp'))
    return [...webp, context.canvas.toDataURL('image/png')]
  })
}

// Abre el archivo, lo dibuja en un lienzo cuadrado con `draw` y devuelve la primera versión que
// quepa en el límite (draw las entrega de la mejor a la más liviana).
async function drawFile(
  file: File,
  side: number,
  draw: (context: CanvasRenderingContext2D, image: HTMLImageElement) => string[],
): Promise<string> {
  if (!SOURCE_TYPES.includes(file.type)) throw new Error('Elige una imagen JPG, PNG o WEBP.')
  if (file.size > MAX_SOURCE_BYTES) throw new Error('La imagen pesa más de 12 MB. Elige una más liviana.')

  const url = URL.createObjectURL(file)
  let candidates: string[]
  try {
    const image = new Image()
    image.src = url
    await image.decode()

    const canvas = document.createElement('canvas')
    canvas.width = side
    canvas.height = side
    const context = canvas.getContext('2d')
    if (!context) throw new Error('sin lienzo')
    context.imageSmoothingQuality = 'high'
    candidates = draw(context, image)
  } catch {
    throw new Error('No se pudo leer la imagen. Prueba con otra.')
  } finally {
    URL.revokeObjectURL(url)
  }

  const fits = candidates.find((candidate) => candidate.length <= MAX_LENGTH)
  if (!fits) throw new Error('La imagen tiene demasiado detalle para guardarla. Prueba con otra más simple.')
  return fits
}
