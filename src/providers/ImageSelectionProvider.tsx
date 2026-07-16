import { createContext, useEffect, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'

import type {
  ImageSelectionAction,
  ImageSelectionState,
  SelectedLocationImage,
} from '@/types/image-selection.ts'
import {
  clearImageSelectionStorage,
  persistImageSelection,
  restoreImageSelection,
} from '@/utils/image-selection-storage.ts'

type ImageSelectionContextValue = {
  images: SelectedLocationImage[]
  isDrawerOpen: boolean
  addImage: (image: SelectedLocationImage) => void
  removeImage: (key: string) => void
  clearSelection: () => void
  isSelected: (key: string) => boolean
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void
}

type ImageSelectionProviderProps = {
  children: ReactNode
}

const MAX_SELECTED_IMAGES = 30

const initialState: ImageSelectionState = {
  images: [],
  isDrawerOpen: false,
}

function imageSelectionReducer(
  state: ImageSelectionState,
  action: ImageSelectionAction,
): ImageSelectionState {
  switch (action.type) {
    case 'add-image': {
      if (state.images.some((image) => image.key === action.payload.key)) {
        return state
      }

      if (state.images.length >= MAX_SELECTED_IMAGES) {
        return state
      }

      return {
        ...state,
        images: [...state.images, action.payload],
      }
    }

    case 'remove-image':
      return {
        ...state,
        images: state.images.filter((image) => image.key !== action.payload.key),
      }

    case 'clear-selection':
      return {
        ...state,
        images: [],
      }

    case 'open-drawer':
      return {
        ...state,
        isDrawerOpen: true,
      }

    case 'close-drawer':
      return {
        ...state,
        isDrawerOpen: false,
      }

    case 'toggle-drawer':
      return {
        ...state,
        isDrawerOpen: !state.isDrawerOpen,
      }

    default:
      return state
  }
}

function createInitialState(): ImageSelectionState {
  return {
    images: restoreImageSelection(),
    isDrawerOpen: false,
  }
}

export const ImageSelectionContext = createContext<ImageSelectionContextValue | undefined>(
  undefined,
)

export function ImageSelectionProvider({
  children,
}: ImageSelectionProviderProps) {
  const [state, dispatch] = useReducer(
    imageSelectionReducer,
    initialState,
    createInitialState,
  )

  useEffect(() => {
    if (state.images.length === 0) {
      clearImageSelectionStorage()
      return
    }

    persistImageSelection(state.images)
  }, [state.images])

  const value = useMemo<ImageSelectionContextValue>(
    () => ({
      images: state.images,
      isDrawerOpen: state.isDrawerOpen,
      addImage: (image) => {
        dispatch({
          type: 'add-image',
          payload: image,
        })
      },
      removeImage: (key) => {
        dispatch({
          type: 'remove-image',
          payload: { key },
        })
      },
      clearSelection: () => {
        dispatch({
          type: 'clear-selection',
        })
      },
      isSelected: (key) => state.images.some((image) => image.key === key),
      openDrawer: () => {
        dispatch({
          type: 'open-drawer',
        })
      },
      closeDrawer: () => {
        dispatch({
          type: 'close-drawer',
        })
      },
      toggleDrawer: () => {
        dispatch({
          type: 'toggle-drawer',
        })
      },
    }),
    [state.images, state.isDrawerOpen],
  )

  return (
    <ImageSelectionContext.Provider value={value}>
      {children}
    </ImageSelectionContext.Provider>
  )
}
