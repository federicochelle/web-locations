import { useContext } from 'react'

import { ImageSelectionContext } from '@/providers/ImageSelectionProvider.tsx'

export function useImageSelection() {
  const context = useContext(ImageSelectionContext)

  if (!context) {
    throw new Error(
      'useImageSelection debe usarse dentro de ImageSelectionProvider.',
    )
  }

  return context
}
