import { supabase } from '@/lib/supabase.ts'

export const MAX_SUBMISSION_IMAGES = 8
export const MAX_SUBMISSION_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
export const ALLOWED_SUBMISSION_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]

export type SubmissionImageUploadContext = {
  submissionId: string
  submissionToken: string
}

export type SubmissionImageUploadUrlResult = {
  uploadUrl: string
  cloudflareImageId: string
  maxImages: number
  remainingSlots: number
}

export type SubmissionImageFinalizeResult = {
  id: string
  cloudflareImageId: string
  imageUrl: string
  sortOrder: number
}

function isUploadUrlResult(value: unknown): value is SubmissionImageUploadUrlResult {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<SubmissionImageUploadUrlResult>

  return (
    typeof candidate.uploadUrl === 'string' &&
    typeof candidate.cloudflareImageId === 'string' &&
    typeof candidate.maxImages === 'number' &&
    typeof candidate.remainingSlots === 'number'
  )
}

function isFinalizeResult(value: unknown): value is SubmissionImageFinalizeResult {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<SubmissionImageFinalizeResult>

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.cloudflareImageId === 'string' &&
    typeof candidate.imageUrl === 'string' &&
    typeof candidate.sortOrder === 'number'
  )
}

function parseFunctionError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

export function isAllowedSubmissionImageType(contentType: string) {
  return ALLOWED_SUBMISSION_IMAGE_TYPES.includes(contentType)
}

export function getSubmissionImageValidationError(file: File) {
  if (!isAllowedSubmissionImageType(file.type)) {
    return 'Formato no permitido. Usa JPG, PNG, WEBP o AVIF.'
  }

  if (file.size > MAX_SUBMISSION_IMAGE_SIZE_BYTES) {
    return 'La imagen supera el maximo de 10 MB.'
  }

  return null
}

export async function requestSubmissionImageUploadUrl(
  context: SubmissionImageUploadContext,
  file: File,
) {
  const { data, error } = await supabase.functions.invoke('submission-image-upload-url', {
    body: {
      submission_id: context.submissionId,
      submission_token: context.submissionToken,
      file_name: file.name,
      content_type: file.type,
      file_size: file.size,
    },
  })

  if (error) {
    throw new Error(parseFunctionError(error, 'No pudimos preparar la subida de la imagen.'))
  }

  if (isUploadUrlResult(data)) {
    return data
  }

  const result = data as { error?: string } | null
  throw new Error(result?.error || 'No pudimos preparar la subida de la imagen.')
}

export async function uploadSubmissionImageToCloudflare(
  uploadUrl: string,
  file: File,
  onProgress?: (progress: number) => void,
) {
  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()

    request.open('POST', uploadUrl)
    request.responseType = 'json'

    request.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) {
        return
      }

      onProgress?.(Math.round((event.loaded / event.total) * 100))
    })

    request.addEventListener('error', () => {
      reject(new Error('No pudimos subir la imagen a Cloudflare.'))
    })

    request.addEventListener('load', () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100)
        resolve()
        return
      }

      const response = request.response as { errors?: { message?: string }[] } | null
      reject(
        new Error(
          response?.errors?.[0]?.message || 'No pudimos subir la imagen a Cloudflare.',
        ),
      )
    })

    const formData = new FormData()
    formData.append('file', file)
    request.send(formData)
  })
}

export async function finalizeSubmissionImage(
  context: SubmissionImageUploadContext,
  cloudflareImageId: string,
  sortOrder: number,
) {
  const { data, error } = await supabase.functions.invoke('submission-image-finalize', {
    body: {
      submission_id: context.submissionId,
      submission_token: context.submissionToken,
      cloudflare_image_id: cloudflareImageId,
      sort_order: sortOrder,
    },
  })

  if (error) {
    throw new Error(parseFunctionError(error, 'No pudimos guardar la imagen.'))
  }

  if (isFinalizeResult(data)) {
    return data
  }

  const result = data as { error?: string } | null
  throw new Error(result?.error || 'No pudimos guardar la imagen.')
}
