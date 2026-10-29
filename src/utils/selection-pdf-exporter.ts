import { jsPDF } from 'jspdf'

import logoUrl from '../../logo.webp'
import coverBackgroundUrl from '@/assets/pdf/cover-background.jpg'
import {
  loadPdfAssetImage,
  prepareImageForPdf,
  type PdfAssetImage,
} from '@/utils/selection-pdf-images.ts'
import {
  PDF_CATEGORY_COVER_OVERLAY_OPACITY,
  formatPdfLocationCode,
  isHorizontalPhoto,
  planSelectionPdfPages,
} from '@/utils/selection-pdf-layout.ts'
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
const PDF_ACCENT = [229, 190, 107] as const
const PDF_CELL_BACKGROUND = [16, 16, 16] as const
const PDF_BLOB_URL_REVOKE_DELAY_MS = 60_000
const PDF_SHARE_TEXT = 'PDF de seleccion generado por Sitio Locaciones.'
function setTextColor(doc: jsPDF, color: readonly [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2])
}

function paintPageBackground(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFillColor(PDF_BACKGROUND[0], PDF_BACKGROUND[1], PDF_BACKGROUND[2])
  doc.rect(0, 0, pageWidth, pageHeight, 'F')
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


// A4 landscape layout, in millimetres. Mirrors the in-app preview (1123 x 794 px at 96 dpi).
const PAGE_MARGIN_X = 5.3
// Hero pages get a taller, stronger header band; grid pages keep the original, discreet one.
// `photoTop` is where the photo area starts, right below the band, so nothing overlaps it.
const PHOTO_PAGE_HEADERS = {
  hero: { top: 0, height: 14, logoHeight: 12, codeFontSize: 28, photoTop: 14 },
  grid: { top: 3.2, height: 6.9, logoHeight: 5.8, codeFontSize: 13, photoTop: 12.2 },
} as const
const GRID_BOTTOM_MARGIN = 5.3
const GRID_GAP = 0.8
const COVER_SIGNATURE_HEIGHT = 12
const COVER_SIGNATURE_BOTTOM = 11
const COVER_LOGOS_TOP = 46
const SITIO_LOGO_ALIAS = 'sitio-logo'
const COVER_BACKGROUND_ALIAS = 'cover-background'
const PX_TO_MM = 25.4 / 96
const PT_TO_MM = 25.4 / 72

type PreparedPdfImage = {
  dataUrl: string
  width: number
  height: number
}

type PreparedCoverLogo = PreparedPdfImage & {
  format: 'JPEG' | 'PNG'
}

type PreparedPhoto = PreparedPdfImage

type Rect = { x: number; y: number; width: number; height: number }

function fillAccentRect(doc: jsPDF, rect: Rect, opacity = 1) {
  doc.setGState(doc.GState({ opacity }))
  doc.setFillColor(PDF_ACCENT[0], PDF_ACCENT[1], PDF_ACCENT[2])
  doc.rect(rect.x, rect.y, rect.width, rect.height, 'F')
  doc.setGState(doc.GState({ opacity: 1 }))
}

// Soft golden radial halo behind the main cover content. jsPDF has no radial gradients, so it
// is built from concentric ellipses painted outside-in with opaque colours blended between the
// background and a faint gold. Opaque fills render the same in every PDF viewer.
function paintCoverHalo(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const layers = 40
  const centerIntensity = 0.12
  const maxRadiusX = pageWidth * 0.385
  const maxRadiusY = pageHeight * 0.42

  for (let layer = 0; layer < layers; layer += 1) {
    const radiusRatio = 1 - layer / layers
    const intensity = centerIntensity * (layer / layers)
    const channel = (index: 0 | 1 | 2) =>
      Math.round(PDF_BACKGROUND[index] + (PDF_ACCENT[index] - PDF_BACKGROUND[index]) * intensity)

    doc.setFillColor(channel(0), channel(1), channel(2))
    doc.ellipse(
      pageWidth / 2,
      pageHeight / 2,
      maxRadiusX * radiusRatio,
      maxRadiusY * radiusRatio,
      'F',
    )
  }
}

// Paints the cover texture covering the whole page. The same alias is reused on every cover, so
// jsPDF embeds the JPEG only once however many categories the PDF has.
function paintCoverTexture(doc: jsPDF, background: PdfAssetImage) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const scale = Math.max(pageWidth / background.width, pageHeight / background.height)
  const width = background.width * scale
  const height = background.height * scale

  paintPageBackground(doc)
  doc.addImage(
    background.dataUrl,
    background.format,
    (pageWidth - width) / 2,
    (pageHeight - height) / 2,
    width,
    height,
    COVER_BACKGROUND_ALIAS,
    'FAST',
  )
}

function paintBlackOverlay(doc: jsPDF, opacity: number) {
  doc.saveGraphicsState()
  doc.setGState(doc.GState({ opacity }))
  doc.setFillColor(0, 0, 0)
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F')
  doc.restoreGraphicsState()
}

function fitInside(image: { width: number; height: number }, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height)

  return { width: image.width * scale, height: image.height * scale }
}

function addSitioLogo(
  doc: jsPDF,
  logo: PreparedCoverLogo | null,
  x: number,
  y: number,
  height: number,
  align: 'left' | 'center' | 'right',
) {
  if (!logo) {
    return
  }

  const width = (logo.width / logo.height) * height
  const left = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x

  doc.addImage(logo.dataUrl, logo.format, left, y, width, height, SITIO_LOGO_ALIAS, 'FAST')
}

function addMainCoverPage(
  doc: jsPDF,
  payload: SelectionPdfPayload,
  sitioLogo: PreparedCoverLogo | null,
  productLogo: PreparedCoverLogo | null,
  companyLogo: PreparedCoverLogo | null,
  background: PdfAssetImage | null,
) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const logos = [productLogo, companyLogo].filter((logo): logo is PreparedCoverLogo => logo !== null)
  const productName = payload.project.product.trim() || 'Selección de locaciones'
  const companyName = payload.project.productionCompany.trim()

  if (background) {
    paintCoverTexture(doc, background)
  } else {
    // Fallback when the texture cannot be loaded: plain dark page with the golden halo.
    paintPageBackground(doc)
    paintCoverHalo(doc)
  }

  const hasLogos = logos.length > 0
  const logoMaxHeight = (logos.length === 1 ? 104 : 88) * PX_TO_MM
  const logoMaxWidth = (logos.length === 1 ? 340 : 260) * PX_TO_MM
  const logoGap = 40 * PX_TO_MM
  const separatorHeight = 64 * PX_TO_MM
  const logosTop = COVER_LOGOS_TOP
  const titleSize = hasLogos ? 42 : 63
  const companySize = 9.75
  const titleMaxWidth = 860 * PX_TO_MM

  // Logos sit at the top of the page.
  const renderedLogos = logos.map((logo) => ({
    logo,
    ...fitInside(logo, logoMaxWidth, logoMaxHeight),
  }))
  const logosRowHeight = hasLogos ? Math.max(...renderedLogos.map((item) => item.height)) : 0

  if (hasLogos) {
    const separatorWidth = logos.length === 2 ? 1 * PX_TO_MM : 0
    const totalWidth =
      renderedLogos.reduce((sum, item) => sum + item.width, 0) +
      (logos.length === 2 ? logoGap * 2 + separatorWidth : 0)
    let cursorX = (pageWidth - totalWidth) / 2

    renderedLogos.forEach((item, index) => {
      doc.addImage(
        item.logo.dataUrl,
        item.logo.format,
        cursorX,
        logosTop + (logosRowHeight - item.height) / 2,
        item.width,
        item.height,
        undefined,
        'FAST',
      )
      cursorX += item.width

      if (logos.length === 2 && index === 0) {
        fillAccentRect(
          doc,
          {
            x: cursorX + logoGap,
            y: logosTop + (logosRowHeight - separatorHeight) / 2,
            width: separatorWidth,
            height: separatorHeight,
          },
          0.5,
        )
        cursorX += logoGap * 2 + separatorWidth
      }
    })
  }

  // Title (and the producer below it) are centred on the page.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(titleSize)
  const titleLines = doc.splitTextToSize(productName, titleMaxWidth) as string[]
  const titleLineHeight = titleSize * PT_TO_MM * 1.08
  const titleHeight = titleLines.length * titleLineHeight
  const lineBlockHeight = hasLogos ? 0 : 8 * PX_TO_MM + 2 * PX_TO_MM
  const companyTopGap = companyName ? (hasLogos ? 20 : 28) * PX_TO_MM : 0
  const companyHeight = companyName ? companySize * PT_TO_MM : 0
  const blockHeight = titleHeight + lineBlockHeight + companyTopGap + companyHeight
  let cursorY = (pageHeight - blockHeight) / 2

  setTextColor(doc, PDF_TEXT_GOLD)
  doc.text(titleLines, pageWidth / 2, cursorY + titleLineHeight * 0.78, {
    align: 'center',
    lineHeightFactor: 1.08,
  })
  cursorY += titleHeight

  if (!hasLogos) {
    cursorY += 8 * PX_TO_MM
    fillAccentRect(
      doc,
      { x: pageWidth / 2 - 48 * PX_TO_MM, y: cursorY, width: 96 * PX_TO_MM, height: 2 * PX_TO_MM },
      0.85,
    )
    cursorY += 2 * PX_TO_MM
  }

  if (companyName) {
    cursorY += companyTopGap
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(companySize)
    doc.setTextColor(PDF_TEXT_GOLD[0], PDF_TEXT_GOLD[1], PDF_TEXT_GOLD[2])
    // jsPDF does not account for letter spacing when centring, so the text is centred by hand.
    const companyText = companyName.toUpperCase()
    const companyCharSpace = companySize * 0.32 * PT_TO_MM
    const companyWidth =
      doc.getTextWidth(companyText) + companyCharSpace * Math.max(0, companyText.length - 1)

    doc.text(companyText, (pageWidth - companyWidth) / 2, cursorY + companyHeight * 0.8, {
      charSpace: companyCharSpace,
    })
  }

  addSitioLogo(
    doc,
    sitioLogo,
    pageWidth / 2,
    pageHeight - COVER_SIGNATURE_BOTTOM - COVER_SIGNATURE_HEIGHT,
    COVER_SIGNATURE_HEIGHT,
    'center',
  )
}

function addCategoryCoverPage(doc: jsPDF, categoryName: string, background: PdfAssetImage | null) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 48 * PX_TO_MM
  const titleSize = 54
  const maxWidth = pageWidth - marginX * 2

  if (background) {
    paintCoverTexture(doc, background)
    paintBlackOverlay(doc, PDF_CATEGORY_COVER_OVERLAY_OPACITY)
  } else {
    paintPageBackground(doc)
  }

  setTextColor(doc, PDF_TEXT_GOLD)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(titleSize)
  const lines = doc.splitTextToSize(categoryName, maxWidth) as string[]
  const lineHeight = titleSize * PT_TO_MM * 1.05
  const top = (pageHeight - lines.length * lineHeight) / 2

  doc.text(lines, pageWidth / 2, top + lineHeight * 0.78, {
    align: 'center',
    lineHeightFactor: 1.05,
  })
}

// Horizontal photos fill the whole cell (slight side crop); vertical and square ones are
// fully visible, centred, never stretched.
function drawPhotoInCell(doc: jsPDF, photo: PreparedPhoto, cell: Rect) {
  doc.setFillColor(PDF_CELL_BACKGROUND[0], PDF_CELL_BACKGROUND[1], PDF_CELL_BACKGROUND[2])
  doc.rect(cell.x, cell.y, cell.width, cell.height, 'F')

  const shouldCover = isHorizontalPhoto(photo.width, photo.height)
  const scale = shouldCover
    ? Math.max(cell.width / photo.width, cell.height / photo.height)
    : Math.min(cell.width / photo.width, cell.height / photo.height)
  const renderWidth = photo.width * scale
  const renderHeight = photo.height * scale
  const renderX = cell.x + (cell.width - renderWidth) / 2
  const renderY = cell.y + (cell.height - renderHeight) / 2

  doc.saveGraphicsState()
  doc.rect(cell.x, cell.y, cell.width, cell.height, null)
  doc.clip()
  doc.discardPath()
  doc.addImage(photo.dataUrl, 'JPEG', renderX, renderY, renderWidth, renderHeight, undefined, 'FAST')
  doc.restoreGraphicsState()
}

function addPhotosPage(
  doc: jsPDF,
  page: { variant: 'hero' | 'grid'; locationCode: string; items: PreparedPhoto[] },
  sitioLogo: PreparedCoverLogo | null,
) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const gridWidth = pageWidth - PAGE_MARGIN_X * 2
  const header = PHOTO_PAGE_HEADERS[page.variant]
  const gridHeight = pageHeight - header.photoTop - GRID_BOTTOM_MARGIN

  paintPageBackground(doc)

  setTextColor(doc, PDF_TEXT_GOLD)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(header.codeFontSize)
  doc.text(
    formatPdfLocationCode(page.locationCode),
    PAGE_MARGIN_X,
    header.top + header.height / 2,
    { baseline: 'middle' },
  )
  addSitioLogo(
    doc,
    sitioLogo,
    pageWidth - PAGE_MARGIN_X,
    header.top + (header.height - header.logoHeight) / 2,
    header.logoHeight,
    'right',
  )

  if (page.variant === 'hero') {
    const [photo] = page.items

    if (photo) {
      drawPhotoInCell(doc, photo, {
        x: PAGE_MARGIN_X,
        y: header.photoTop,
        width: gridWidth,
        height: gridHeight,
      })
    }

    return
  }

  const cellWidth = (gridWidth - GRID_GAP) / 2
  const cellHeight = (gridHeight - GRID_GAP) / 2

  page.items.forEach((photo, index) => {
    drawPhotoInCell(doc, photo, {
      x: PAGE_MARGIN_X + (index % 2) * (cellWidth + GRID_GAP),
      y: header.photoTop + Math.floor(index / 2) * (cellHeight + GRID_GAP),
      width: cellWidth,
      height: cellHeight,
    })
  })
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
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  const totalImages = payload.totalImages
  const failedImages: SelectionPdfFailedImage[] = []
  let includedImages = 0

  async function prepareLogo(imageUrl: string | null | undefined) {
    if (!imageUrl) {
      return null
    }

    try {
      const preparedLogo = await prepareImageForPdf(imageUrl, { mimeType: 'image/png' })

      return { ...preparedLogo, format: 'PNG' as const }
    } catch {
      // A logo that cannot be prepared is simply left out; the cover falls back gracefully.
      return null
    }
  }

  async function loadCoverBackground() {
    try {
      return await loadPdfAssetImage(coverBackgroundUrl)
    } catch {
      // Covers fall back to the plain dark background when the texture cannot be loaded.
      return null
    }
  }

  const [sitioLogo, companyLogo, productLogo, coverBackground] = await Promise.all([
    prepareLogo(logoUrl),
    prepareLogo(payload.project.productionCompanyLogoUrl),
    prepareLogo(payload.project.productLogoUrl),
    loadCoverBackground(),
  ])

  addMainCoverPage(doc, payload, sitioLogo, productLogo, companyLogo, coverBackground)

  let globalImageIndex = 0
  let completedImages = 0
  const preparedLocations: Array<{
    locationCode: string
    categorySlug: string
    categoryName?: string | null
    items: PreparedPhoto[]
  }> = []

  for (const location of payload.locations) {
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
    const items: PreparedPhoto[] = []

    for (const preparedLocationResult of preparedLocationResults) {
      if (preparedLocationResult.result.kind === 'success') {
        items.push(preparedLocationResult.result.preparedImage)
        includedImages += 1
      } else {
        failedImages.push(preparedLocationResult.result.failedImage)
      }
    }

    globalImageIndex += location.images.length
    preparedLocations.push({
      locationCode: location.locationCode,
      categorySlug: location.categorySlug,
      categoryName: location.categoryName,
      items,
    })
  }

  if (includedImages === 0) {
    throw new Error(
      'No pudimos generar el PDF porque ninguna imagen pudo procesarse.',
    )
  }

  // Pages are planned from the images that were actually prepared, so a category cover is only
  // added when it has at least one photo and no page is ever empty.
  for (const page of planSelectionPdfPages(preparedLocations)) {
    doc.addPage()

    if (page.kind === 'category') {
      addCategoryCoverPage(doc, page.categoryName, coverBackground)
    } else {
      addPhotosPage(doc, page, sitioLogo)
    }
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
