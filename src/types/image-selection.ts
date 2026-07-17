export type SelectedLocationImage = {
  key: string
  imageUrl: string
  locationImageId?: string | null
  sortOrder: number | null
  locationId: string
  locationCode: string
  locationTitle: string
  categorySlug: string
  selectedAt: string
}

export type ImageSelectionState = {
  images: SelectedLocationImage[]
  isDrawerOpen: boolean
}

export type ImageSelectionAction =
  | {
      type: 'add-image'
      payload: SelectedLocationImage
    }
  | {
      type: 'replace-selection'
      payload: SelectedLocationImage[]
    }
  | {
      type: 'remove-image'
      payload: {
        key: string
      }
    }
  | {
      type: 'clear-selection'
    }
  | {
      type: 'open-drawer'
    }
  | {
      type: 'close-drawer'
    }
  | {
      type: 'toggle-drawer'
    }
