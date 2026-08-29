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

const PDF_IMAGE_PREPARATION_CONCURRENCY = 4
const PDF_BACKGROUND = [8, 8, 8] as const
const PDF_TEXT_GOLD = [215, 192, 162] as const
const PDF_BLOB_URL_REVOKE_DELAY_MS = 60_000
const PDF_SHARE_TEXT = 'PDF de seleccion generado por Film Locations Uruguay.'
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

function formatLocationCode(value: string) {
  return value.replace(/-/g, ' ')
}

type PreparedCoverLogo = {
  dataUrl: string
  width: number
  height: number
  format: 'JPEG' | 'PNG'
}

type RenderedCoverLogo = PreparedCoverLogo & {
  renderWidth: number
  renderHeight: number
}

type CoverLogosLayout = {
  logos: RenderedCoverLogo[]
  totalWidth: number
  maxRenderedHeight: number
}

function getCoverLogosLayout(logos: PreparedCoverLogo[]): CoverLogosLayout {
  if (logos.length === 0) {
    return {
      logos: [],
      totalWidth: 0,
      maxRenderedHeight: 0,
    }
  }

  if (logos.length === 1) {
    const [logo] = logos

    if (!logo) {
      return {
        logos: [],
        totalWidth: 0,
        maxRenderedHeight: 0,
      }
    }

    const maxLogoWidth = 192
    const maxLogoHeight = 118
    const scale = Math.min(maxLogoWidth / logo.width, maxLogoHeight / logo.height)
    const renderWidth = logo.width * scale
    const renderHeight = logo.height * scale

    return {
      logos: [
        {
          ...logo,
          renderWidth,
          renderHeight,
        },
      ],
      totalWidth: renderWidth,
      maxRenderedHeight: renderHeight,
    }
  }

  const gap = 12
  const maxLogoWidth = 92
  const maxLogoHeight = 46
  const renderedLogos = logos.map((logo) => {
    const scale = Math.min(maxLogoWidth / logo.width, maxLogoHeight / logo.height)

    return {
      ...logo,
      renderWidth: logo.width * scale,
      renderHeight: logo.height * scale,
    }
  })
  const totalWidth =
    renderedLogos.reduce((sum, logo) => sum + logo.renderWidth, 0) +
    gap * Math.max(0, renderedLogos.length - 1)
  const maxRenderedHeight = renderedLogos.reduce(
    (maxHeight, logo) => Math.max(maxHeight, logo.renderHeight),
    0,
  )

  return {
    logos: renderedLogos,
    totalWidth,
    maxRenderedHeight,
  }
}

function addCoverLogos(doc: jsPDF, logos: PreparedCoverLogo[], renderY = 18) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const logosLayout = getCoverLogosLayout(logos)

  if (logosLayout.logos.length === 0) {
    return 52
  }

  const gap = 12
  let currentX = (pageWidth - logosLayout.totalWidth) / 2

  logosLayout.logos.forEach((logo, index) => {
    const renderYWithOffset = renderY + (logosLayout.maxRenderedHeight - logo.renderHeight) / 2

    doc.addImage(
      logo.dataUrl,
      logo.format,
      currentX,
      renderYWithOffset,
      logo.renderWidth,
      logo.renderHeight,
      undefined,
      'FAST',
    )

    currentX += logo.renderWidth

    if (index < logosLayout.logos.length - 1) {
      currentX += gap
    }
  })

  return renderY + logosLayout.maxRenderedHeight
}

function addCoverPage(
  doc: jsPDF,
  payload: SelectionPdfPayload,
  logos: PreparedCoverLogo[],
) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let topCardY = 66

  paintPageBackground(doc)

  const maxTextWidth = pageWidth - 48
  const details = [
    ['Producto', payload.project.product],
    ['Productora', payload.project.productionCompany],
  ] as const
  const hasProductionCompany = payload.project.productionCompany.trim().length > 0
  const detailsBlockHeight = details.reduce((totalHeight, [, value]) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(18)
    const lines = doc.splitTextToSize(value || '—', maxTextWidth)

    return totalHeight + 8 + lines.length * 8 + 8
  }, 0)

  if (hasProductionCompany) {
    const logoBlockHeight = getCoverLogosLayout(logos).maxRenderedHeight
    const logoTextGap = logoBlockHeight > 0 ? 14 : 0
    const contentBlockHeight = logoBlockHeight + logoTextGap + detailsBlockHeight
    const centeredBlockStartY = Math.max(
      18,
      (pageHeight - 20 - contentBlockHeight) / 2,
    )

    if (logos.length > 0) {
      topCardY = addCoverLogos(doc, logos, centeredBlockStartY) + logoTextGap
    } else {
      topCardY = centeredBlockStartY
    }
  } else if (logos.length > 0) {
    topCardY = addCoverLogos(doc, logos) + 14
  }

  let currentY = topCardY
  details.forEach(([label, value]) => {
    setTextColor(doc, PDF_TEXT_GOLD)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(label.toUpperCase(), pageWidth / 2, currentY, {
      align: 'center',
    })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(18)
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
  isFirstPage: boolean,
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

  if (isFirstPage) {
    setTextColor(doc, PDF_TEXT_GOLD)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(30)
    doc.text(formatLocationCode(location.locationCode), pageWidth / 2, 24, {
      align: 'center',
    })

    if (showTitle) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(12)
      doc.text(location.locationTitle, pageWidth / 2, 34, {
        align: 'center',
      })
    }
  }

  const imageStartY = isFirstPage ? 48 : topImageY

  pageImages.forEach((image, index) => {
    const slotY = imageStartY + index * (imageAreaHeight + slotGap)
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

type PreparedLocationImageResult =
  | {
      kind: 'success'
      preparedImage: {
        dataUrl: string
        width: number
        height: number
      }
    }
  | {
      kind: 'error'
      failedImage: SelectionPdfFailedImage
    }

type PreparedLocationImageTask = {
  globalIndex: number
  imageIndex: number
  imageKey: string
  imageUrl: string
  locationCode: string
  prepare: () => Promise<PreparedLocationImageResult>
}

async function runLimitedConcurrencyPool<T>(
  tasks: Array<() => Promise<T>>,
  concurrencyLimit: number,
) {
  const results = new Array<T>(tasks.length)
  let nextTaskIndex = 0

  async function worker() {
    while (true) {
      const taskIndex = nextTaskIndex
      nextTaskIndex += 1

      if (taskIndex >= tasks.length) {
        return
      }

      results[taskIndex] = await tasks[taskIndex]()
    }
  }

  const workerCount = Math.min(concurrencyLimit, tasks.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))

  return results
}

async function prepareLocationImagesForPdf(
  location: SelectionPdfLocation,
  globalStartIndex: number,
  onImageSettled?: (task: PreparedLocationImageTask) => void,
) {
  const imageTasks: PreparedLocationImageTask[] = location.images.map((image, imageIndex) => ({
    globalIndex: globalStartIndex + imageIndex + 1,
    imageIndex,
    imageKey: image.key,
    imageUrl: image.imageUrl,
    locationCode: location.locationCode,
    prepare: async () => {
      let result: PreparedLocationImageResult

      try {
        const preparedImage = await prepareImageForPdf(image.imageUrl)

        result = {
          kind: 'success' as const,
          preparedImage,
        }
      } catch (error) {
        result = {
          kind: 'error' as const,
          failedImage: {
            key: image.key,
            imageUrl: image.imageUrl,
            locationCode: location.locationCode,
            message:
              error instanceof Error
                ? error.message
                : 'No pudimos incluir la imagen en el PDF.',
          },
        }
      } finally {
        onImageSettled?.(imageTasks[imageIndex]!)
      }

      return result
    },
  }))

  const preparedResults = await runLimitedConcurrencyPool(
    imageTasks.map((task) => async () => task.prepare()),
    PDF_IMAGE_PREPARATION_CONCURRENCY,
  )

  return imageTasks.map((task, resultIndex) => ({
    ...task,
    result: preparedResults[resultIndex],
  }))
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
  let pdfCompositionDurationMs = 0

  const coverLogos: PreparedCoverLogo[] = []

  try {
    const preparedLogo = await prepareImageForPdf(logoUrl, {
      mimeType: 'image/png',
    })
    coverLogos.push({
      ...preparedLogo,
      format: 'PNG',
    })
  } catch {
    // Keep building the PDF without the Film Locations logo if it cannot be prepared.
  }

  if (payload.project.productionCompanyLogoUrl) {
    try {
      const preparedProductionCompanyLogo = await prepareImageForPdf(
        payload.project.productionCompanyLogoUrl,
        {
          mimeType: 'image/png',
        },
      )
      coverLogos.push({
        ...preparedProductionCompanyLogo,
        format: 'PNG',
      })
    } catch {
      // Ignore production company logo failures and keep generating the PDF.
    }
  }

  const coverPageStartedAt = performance.now()
  addCoverPage(doc, payload, coverLogos)
  pdfCompositionDurationMs += performance.now() - coverPageStartedAt

  let globalImageIndex = 0
  let completedImages = 0

  for (const location of payload.locations) {
    let isFirstLocationPage = true
    let pageImages: Array<{
      dataUrl: string
      width: number
      height: number
    }> = []
    const preparedLocationResults = await prepareLocationImagesForPdf(
      location,
      globalImageIndex,
      (task) => {
        completedImages += 1
        options.onProgress?.({
          stage: 'preparing-images',
          percent: 5 + Math.round((completedImages / Math.max(1, totalImages)) * 75),
          current: completedImages,
          total: totalImages,
          locationCode: task.locationCode,
        })
      },
    )

    for (const preparedLocationResult of preparedLocationResults) {
      processedImages += 1
      if (preparedLocationResult.result.kind === 'success') {
        pageImages.push(preparedLocationResult.result.preparedImage)
        includedImages += 1

        if (pageImages.length === 2) {
          const pageStartedAt = performance.now()
          addLocationPage(doc, location, pageImages, isFirstLocationPage)
          pdfCompositionDurationMs += performance.now() - pageStartedAt
          isFirstLocationPage = false
          pageImages = []
        }
      } else {
        failedImages.push(preparedLocationResult.result.failedImage)
      }
    }

    globalImageIndex += location.images.length

    if (pageImages.length > 0) {
      const pageStartedAt = performance.now()
      addLocationPage(doc, location, pageImages, isFirstLocationPage)
      pdfCompositionDurationMs += performance.now() - pageStartedAt
    }
  }

  if (includedImages === 0) {
    throw new Error(
      'No pudimos generar el PDF porque ninguna imagen pudo procesarse.',
    )
  }

  options.onProgress?.({
    stage: 'building-pdf',
    percent: 80,
    current: totalImages,
    total: totalImages,
  })

  const blob = doc.output('blob')

  options.onProgress?.({
    stage: 'building-pdf',
    percent: 85,
    current: totalImages,
    total: totalImages,
  })

  return {
    blob,
    fileName: buildPdfFileName(payload),
    totalImages,
    includedImages,
    failedImages,
  }
}

export async function downloadSelectionPdf(blob: Blob, fileName: string) {
  if (shouldTryShareSelectionPdfFile() && await tryShareSelectionPdfFile(blob, fileName)) {
    return
  }

  triggerSelectionPdfDownload(blob, fileName)
}

function triggerSelectionPdfDownload(blob: Blob, fileName: string) {
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const shouldOpenInNewTab = shouldUseSeparatePdfTabOnMobileSafari()

  link.href = blobUrl
  link.download = fileName
  if (shouldOpenInNewTab) {
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
  }

  document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => {
    URL.revokeObjectURL(blobUrl)
  }, PDF_BLOB_URL_REVOKE_DELAY_MS)
}

function shouldTryShareSelectionPdfFile() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia('(max-width: 767px)').matches
}

async function tryShareSelectionPdfFile(blob: Blob, fileName: string) {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false
  }

  const pdfFile = new File([blob], fileName, {
    type: blob.type || 'application/pdf',
  })
  const shareData: ShareData = {
    files: [pdfFile],
    title: fileName,
    text: PDF_SHARE_TEXT,
  }

  if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [pdfFile] })) {
    return false
  }

  try {
    await navigator.share(shareData)
    return true
  } catch {
    return false
  }
}

function isMobileSafari() {
  if (typeof navigator === 'undefined') {
    return false
  }

  const userAgent = navigator.userAgent
  const isAppleMobileDevice =
    /iP(ad|hone|od)/.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isWebKitBrowser = /AppleWebKit/i.test(userAgent)
  const isAlternativeBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\//.test(userAgent)

  return isAppleMobileDevice && isWebKitBrowser && !isAlternativeBrowser
}

export function shouldUseSeparatePdfTabOnMobileSafari() {
  return isMobileSafari()
}

export function openSelectionPdfInNewTab(blob: Blob, fileName: string) {
  const blobUrl = URL.createObjectURL(blob)
  const openedWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer')

  if (!openedWindow) {
    const fallbackLink = document.createElement('a')
    fallbackLink.href = blobUrl
    fallbackLink.target = '_blank'
    fallbackLink.rel = 'noopener noreferrer'
    fallbackLink.download = fileName
    document.body.appendChild(fallbackLink)
    fallbackLink.click()
    fallbackLink.remove()
  }

  window.setTimeout(() => {
    URL.revokeObjectURL(blobUrl)
  }, PDF_BLOB_URL_REVOKE_DELAY_MS)
}
