import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  finalizeSubmissionImage,
  getSubmissionImageValidationError,
  MAX_SUBMISSION_IMAGES,
  requestSubmissionImageUploadUrl,
  type SubmissionImageFinalizeResult,
  type SubmissionImageUploadContext,
  uploadSubmissionImageToCloudflare,
} from '@/services/submission-images.service.ts'

type SubmissionImageStatus = 'pending' | 'uploading' | 'uploaded' | 'error'

export type SubmissionImageItem = {
  id: string
  file: File
  previewUrl: string
  status: SubmissionImageStatus
  progress: number
  error: string | null
  sortOrder: number
  result: SubmissionImageFinalizeResult | null
}

type UploadSummary = {
  uploadedCount: number
  failedCount: number
}

function createImageItem(file: File, sortOrder: number): SubmissionImageItem {
  return {
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
    status: 'pending',
    progress: 0,
    error: null,
    sortOrder,
    result: null,
  }
}

export function useSubmissionImages() {
  const [items, setItems] = useState<SubmissionImageItem[]>([])
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const itemsRef = useRef<SubmissionImageItem[]>([])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        URL.revokeObjectURL(item.previewUrl)
      })
    }
  }, [])

  const uploadedCount = useMemo(
    () => items.filter((item) => item.status === 'uploaded').length,
    [items],
  )

  const pendingCount = useMemo(
    () => items.filter((item) => item.status === 'pending').length,
    [items],
  )

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const incomingFiles = Array.from(fileList)

    if (incomingFiles.length === 0) {
      return
    }

    setSelectionError(null)

    setItems((currentItems) => {
      const nextItems = [...currentItems]
      let nextSortOrder = currentItems.length

      for (const file of incomingFiles) {
        if (nextItems.length >= MAX_SUBMISSION_IMAGES) {
          setSelectionError('Puedes adjuntar hasta 8 imagenes por postulacion.')
          break
        }

        const validationError = getSubmissionImageValidationError(file)
        const nextItem = createImageItem(file, nextSortOrder)
        nextSortOrder += 1

        if (validationError) {
          nextItem.status = 'error'
          nextItem.error = validationError
        }

        nextItems.push(nextItem)
      }

      return nextItems
    })
  }, [])

  const removeItem = useCallback((itemId: string) => {
    setItems((currentItems) => {
      const itemToRemove = currentItems.find((item) => item.id === itemId)

      if (itemToRemove) {
        URL.revokeObjectURL(itemToRemove.previewUrl)
      }

      return currentItems.filter((item) => item.id !== itemId)
    })
  }, [])

  const resetItems = useCallback(() => {
    setItems((currentItems) => {
      currentItems.forEach((item) => {
        URL.revokeObjectURL(item.previewUrl)
      })

      return []
    })
    setSelectionError(null)
  }, [])

  const uploadImages = useCallback(
    async (context: SubmissionImageUploadContext): Promise<UploadSummary> => {
      const uploadableItems = items.filter((item) => item.status === 'pending')

      if (uploadableItems.length === 0) {
        return { uploadedCount: 0, failedCount: 0 }
      }

      setIsUploading(true)

      let uploadedCount = 0
      let failedCount = 0

      try {
        for (const item of uploadableItems) {
          setItems((currentItems) =>
            currentItems.map((currentItem) =>
              currentItem.id === item.id
                ? {
                    ...currentItem,
                    status: 'uploading',
                    progress: 0,
                    error: null,
                  }
                : currentItem,
            ),
          )

          try {
            const uploadTarget = await requestSubmissionImageUploadUrl(context, item.file)

            await uploadSubmissionImageToCloudflare(
              uploadTarget.uploadUrl,
              item.file,
              (progress) => {
                setItems((currentItems) =>
                  currentItems.map((currentItem) =>
                    currentItem.id === item.id
                      ? {
                          ...currentItem,
                          progress,
                        }
                      : currentItem,
                  ),
                )
              },
            )

            const result = await finalizeSubmissionImage(
              context,
              uploadTarget.cloudflareImageId,
              item.sortOrder,
            )

            uploadedCount += 1

            setItems((currentItems) =>
              currentItems.map((currentItem) =>
                currentItem.id === item.id
                  ? {
                      ...currentItem,
                      status: 'uploaded',
                      progress: 100,
                      error: null,
                      result,
                    }
                  : currentItem,
              ),
            )
          } catch (error) {
            failedCount += 1

            setItems((currentItems) =>
              currentItems.map((currentItem) =>
                currentItem.id === item.id
                  ? {
                      ...currentItem,
                      status: 'error',
                      progress: 0,
                      error:
                        error instanceof Error
                          ? error.message
                          : 'No pudimos subir esta imagen.',
                    }
                  : currentItem,
              ),
            )
          }
        }

        return { uploadedCount, failedCount }
      } finally {
        setIsUploading(false)
      }
    },
    [items],
  )

  return {
    items,
    isUploading,
    pendingCount,
    uploadedCount,
    selectionError,
    addFiles,
    removeItem,
    resetItems,
    uploadImages,
  }
}
