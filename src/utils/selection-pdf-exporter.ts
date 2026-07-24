import { jsPDF } from 'jspdf'

import logoUrl from '../../logo.webp'
import { prepareImageForPdf } from '@/utils/selection-pdf-images.ts'
import type {
  SelectionPdfExportResult,
  SelectionPdfFailedImage,
  SelectionPdfLocation,
  SelectionPdfPayload,
  SelectionPdfProgress,
} from '@/types/selection-pdf.ts'

type CreateSelectionPdfOptions = {
  onProgress?: (progress: SelectionPdfProgress) => void
}

const PDF_BACKGROUND = [8, 8, 8] as const
const PDF_TEXT_GOLD = [215, 192, 162] as const
function setTextColor(doc: jsPDF, color: readonly [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2])
}

function paintPageBackground(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFillColor(PDF_BACKGROUND[0], PDF_BACKGROUND[1], PDF_BACKGROUND[2])
  doc.rect(0, 0, pageWidth, pageHeight, 'F')
}

function addPageNumber(doc: jsPDF, pageNumber: number) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  setTextColor(doc, PDF_TEXT_GOLD)
  doc.text(String(pageNumber), pageWidth / 2, pageHeight - 10, {
    align: 'center',
  })
}

function formatDateForDisplay(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('es-UY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function formatDateForFileName(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10)
  }

  return date.toISOString().slice(0, 10)
}

function normalizeFileNameSegment(value: string) {
  const normalizedValue = value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalizedValue || 'locaciones'
}

function buildPdfFileName(payload: SelectionPdfPayload) {
  const productSegment = normalizeFileNameSegment(payload.project.product)
  const dateSegment = formatDateForFileName(payload.generatedAt)

  if (productSegment) {
    return `seleccion-${productSegment}-${dateSegment}.pdf`
  }

  return `seleccion-locaciones-${dateSegment}.pdf`
}

function addCoverPage(
  doc: jsPDF,
  payload: SelectionPdfPayload,
  logo: {
    dataUrl: string
    width: number
    height: number
    format: 'JPEG' | 'PNG'
  } | null,
) {
  const pageWidth = doc.internal.pageSize.getWidth()
  let topCardY = 66

  paintPageBackground(doc)

  if (logo) {
    const maxLogoWidth = 180
    const maxLogoHeight = 110
    const scale = Math.min(maxLogoWidth / logo.width, maxLogoHeight / logo.height)
    const renderWidth = logo.width * scale
    const renderHeight = logo.height * scale
    const renderX = (pageWidth - renderWidth) / 2
    const renderY = 18
    topCardY = renderY + renderHeight + 14

    doc.addImage(
      logo.dataUrl,
      logo.format,
      renderX,
      renderY,
      renderWidth,
      renderHeight,
      undefined,
      'FAST',
    )
  }

  const maxTextWidth = pageWidth - 48
  const details = [
    ['Producto', payload.project.product],
    ['Productora', payload.project.productionCompany],
    ['Jefe de locaciones', payload.project.locationManager],
    ['Fecha', formatDateForDisplay(payload.generatedAt)],
    ['Total de locaciones', String(payload.totalLocations)],
    ['Total de imagenes', String(payload.totalImages)],
  ] as const

  let currentY = topCardY
  details.forEach(([label, value]) => {
    setTextColor(doc, PDF_TEXT_GOLD)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(label.toUpperCase(), pageWidth / 2, currentY, {
      align: 'center',
    })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(17)
    const lines = doc.splitTextToSize(value || '—', maxTextWidth)
    doc.text(lines, pageWidth / 2, currentY + 8, {
      align: 'center',
    })
    currentY += 8 + lines.length * 8 + 8
  })

  addPageNumber(doc, 1)
}

function addLocationPage(
  doc: jsPDF,
  location: SelectionPdfLocation,
  pageImages: Array<{
    dataUrl: string
    width: number
    height: number
  }>,
) {
  doc.addPage()

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 16
  const contentWidth = pageWidth - margin * 2
  const imageAreaHeight = 116
  const slotGap = 10
  const topImageY = 44
  const showTitle =
    location.locationTitle.trim().length > 0 &&
    location.locationTitle !== location.locationCode

  paintPageBackground(doc)

  setTextColor(doc, PDF_TEXT_GOLD)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(location.locationCode, margin, 22)

  if (showTitle) {
    setTextColor(doc, PDF_TEXT_GOLD)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(location.locationTitle, margin, 30)
  }

  pageImages.forEach((image, index) => {
    const slotY = topImageY + index * (imageAreaHeight + slotGap)
    const widthScale = contentWidth / image.width
    const heightScale = imageAreaHeight / image.height
    const scale = Math.min(widthScale, heightScale)
    const renderWidth = image.width * scale
    const renderHeight = image.height * scale
    const renderX = margin + (contentWidth - renderWidth) / 2
    const renderY = slotY + (imageAreaHeight - renderHeight) / 2

    doc.addImage(
      image.dataUrl,
      'JPEG',
      renderX,
      renderY,
      renderWidth,
      renderHeight,
      undefined,
      'FAST',
    )
  })

  addPageNumber(doc, doc.getNumberOfPages())
}

export async function createSelectionPdf(
  payload: SelectionPdfPayload,
  options: CreateSelectionPdfOptions = {},
): Promise<SelectionPdfExportResult> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  const totalImages = payload.totalImages
  const failedImages: SelectionPdfFailedImage[] = []
  let includedImages = 0
  let processedImages = 0

  let logo: {
    dataUrl: string
    width: number
    height: number
    format: 'JPEG' | 'PNG'
  } | null = null

  try {
    const preparedLogo = await prepareImageForPdf(logoUrl, {
      mimeType: 'image/png',
    })
    logo = {
      ...preparedLogo,
      format: 'PNG',
    }
  } catch {
    logo = null
  }

  addCoverPage(doc, payload, logo)

  for (const location of payload.locations) {
    let pageImages: Array<{
      dataUrl: string
      width: number
      height: number
    }> = []

    for (const image of location.images) {
      processedImages += 1
      options.onProgress?.({
        current: processedImages,
        total: totalImages,
        locationCode: location.locationCode,
      })

      try {
        const preparedImage = await prepareImageForPdf(image.imageUrl)

        pageImages.push(preparedImage)
        includedImages += 1

        if (pageImages.length === 2) {
          addLocationPage(doc, location, pageImages)
          pageImages = []
        }
      } catch (error) {
        failedImages.push({
          key: image.key,
          imageUrl: image.imageUrl,
          locationCode: location.locationCode,
          message:
            error instanceof Error
              ? error.message
              : 'No pudimos incluir la imagen en el PDF.',
        })
      }
    }

    if (pageImages.length > 0) {
      addLocationPage(doc, location, pageImages)
    }
  }

  if (includedImages === 0) {
    throw new Error(
      'No pudimos generar el PDF porque ninguna imagen pudo procesarse.',
    )
  }

  return {
    blob: doc.output('blob'),
    fileName: buildPdfFileName(payload),
    totalImages,
    includedImages,
    failedImages,
  }
}

export function downloadSelectionPdf(blob: Blob, fileName: string) {
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = blobUrl
  link.download = fileName
  link.click()

  window.setTimeout(() => {
    URL.revokeObjectURL(blobUrl)
  }, 0)
}
