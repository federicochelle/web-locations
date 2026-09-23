import type { ReactNode } from 'react'

import { SelectionDebugPanel } from '@/components/selection/SelectionDebugPanel.tsx'
import { ImageSelectionProvider } from '@/providers/ImageSelectionProvider.tsx'
import { RequestProjectsProvider } from '@/providers/RequestProjectsProvider.tsx'

type PrivateFeatureProvidersProps = {
  children: ReactNode
}

export function PrivateFeatureProviders({
  children,
}: PrivateFeatureProvidersProps) {
  return (
    <RequestProjectsProvider>
      <ImageSelectionProvider>
        {children}
        <SelectionDebugPanel />
      </ImageSelectionProvider>
    </RequestProjectsProvider>
  )
}
