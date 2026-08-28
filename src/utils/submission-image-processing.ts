const SUBMISSION_IMAGE_MAX_LONG_EDGE = 2400
const SUBMISSION_IMAGE_JPEG_QUALITY_STEPS = [0.82, 0.74, 0.66]
const SUBMISSION_IMAGE_TARGET_MAX_BYTES = 2.5 * 1024 * 1024

function getJpegFileName(fileName: string) {
  const normalizedName = fileName.trim()

  if (!normalizedName) {
    return 'submission-image.jpg'
  }

  const lastDotIndex = normalizedName.lastIndexOf('.')
  const baseName = lastDotIndex > 0
    ? normalizedName.slice(0, lastDotIndex)
    : normalizedName

  return `${baseName || 'submission-image'}.jpg`
}

function buildImageProcessingError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'No pudimos procesar la imagen seleccionada.'
}

async function loadImageElement(file: File) {
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image()

      nextImage.onload = () => resolve(nextImage)
      nextImage.onerror = () => reject(new Error('No pudimos decodificar la imagen.'))
      nextImage.src = objectUrl
    })

    return image
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
) {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality)
  })

  if (!blob) {
    throw new Error('No pudimos exportar la imagen procesada.')
  }

  return blob
}

export async function prepareSubmissionImageForUpload(file: File) {
  let canvas: HTMLCanvasElement | null = null
  let image: HTMLImageElement | null = null

  try {
    image = await loadImageElement(file)

    const sourceWidth = image.naturalWidth
    const sourceHeight = image.naturalHeight

    if (sourceWidth <= 0 || sourceHeight <= 0) {
      throw new Error('No pudimos leer el tamano de la imagen.')
    }

    const scale = Math.min(
      1,
      SUBMISSION_IMAGE_MAX_LONG_EDGE / Math.max(sourceWidth, sourceHeight),
    )
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale))
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale))

    canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight

    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('No pudimos preparar la imagen para subir.')
    }

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, targetWidth, targetHeight)
    context.drawImage(image, 0, 0, targetWidth, targetHeight)

    let bestBlob: Blob | null = null

    for (const quality of SUBMISSION_IMAGE_JPEG_QUALITY_STEPS) {
      const blob = await canvasToBlob(canvas, 'image/jpeg', quality)
      bestBlob = blob

      if (blob.size <= SUBMISSION_IMAGE_TARGET_MAX_BYTES) {
        break
      }
    }

    if (!bestBlob) {
      throw new Error('No pudimos preparar la imagen para subir.')
    }

    return new File(
      [bestBlob],
      getJpegFileName(file.name),
      {
        type: 'image/jpeg',
        lastModified: Date.now(),
      },
    )
  } catch (error) {
    throw new Error(buildImageProcessingError(error))
  } finally {
    if (image) {
      image.src = ''
    }

    if (canvas) {
      canvas.width = 0
      canvas.height = 0
    }
  }
}
