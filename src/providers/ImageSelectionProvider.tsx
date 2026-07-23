import { createContext, useCallback, useEffect, useMemo, useReducer } from 'react'
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
  replaceSelection: (images: SelectedLocationImage[]) => void
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

    case 'replace-selection':
      return {
        ...state,
        images: action.payload.slice(0, MAX_SELECTED_IMAGES),
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

  const addImage = useCallback((image: SelectedLocationImage) => {
    dispatch({
      type: 'add-image',
      payload: image,
    })
  }, [])

  const replaceSelection = useCallback((images: SelectedLocationImage[]) => {
    dispatch({
      type: 'replace-selection',
      payload: images,
    })
  }, [])

  const removeImage = useCallback((key: string) => {
    dispatch({
      type: 'remove-image',
      payload: { key },
    })
  }, [])

  const clearSelection = useCallback(() => {
    dispatch({
      type: 'clear-selection',
    })
  }, [])

  const openDrawer = useCallback(() => {
    dispatch({
      type: 'open-drawer',
    })
  }, [])

  const closeDrawer = useCallback(() => {
    dispatch({
      type: 'close-drawer',
    })
  }, [])

  const toggleDrawer = useCallback(() => {
    dispatch({
      type: 'toggle-drawer',
    })
  }, [])

  const isSelected = useCallback(
    (key: string) => state.images.some((image) => image.key === key),
    [state.images],
  )

  const value = useMemo<ImageSelectionContextValue>(
    () => ({
      images: state.images,
      isDrawerOpen: state.isDrawerOpen,
      addImage,
      replaceSelection,
      removeImage,
      clearSelection,
      isSelected,
      openDrawer,
      closeDrawer,
      toggleDrawer,
    }),
    [
      addImage,
      clearSelection,
      closeDrawer,
      isSelected,
      openDrawer,
      removeImage,
      replaceSelection,
      state.images,
      state.isDrawerOpen,
      toggleDrawer,
    ],
  )

  return (
    <ImageSelectionContext.Provider value={value}>
      {children}
    </ImageSelectionContext.Provider>
  )
}
