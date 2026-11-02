import { useCallback, useRef, useState } from 'react'

import type {
  PdfFailedImagesDecision,
  PdfFailedImagesSummary,
} from '@/utils/selection-pdf-failures.ts'

// Lets a submission flow wait for the user's choice when some photos could not be included in
// the PDF. `askFailedImages` is passed to the submission; `modalProps` go to PdfFailedImagesModal.
export function usePdfFailedImagesPrompt() {
  const [summary, setSummary] = useState<PdfFailedImagesSummary | null>(null)
  const resolverRef = useRef<((decision: PdfFailedImagesDecision) => void) | null>(null)

  const askFailedImages = useCallback((nextSummary: PdfFailedImagesSummary) => {
    return new Promise<PdfFailedImagesDecision>((resolve) => {
      resolverRef.current = resolve
      setSummary(nextSummary)
    })
  }, [])

  const onDecision = useCallback((decision: PdfFailedImagesDecision) => {
    resolverRef.current?.(decision)
    resolverRef.current = null
    setSummary(null)
  }, [])

  return { askFailedImages, modalProps: { summary, onDecision } }
}
