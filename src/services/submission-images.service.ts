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
  bucket: string
  path: string
  maxImages: number
  remainingSlots: number
  signedUrl: string
  token: string
}

export type SubmissionImageFinalizeResult = {
  id: string
  storageBucket: string
  storagePath: string
  sortOrder: number
}

function isUploadUrlResult(value: unknown): value is SubmissionImageUploadUrlResult {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<SubmissionImageUploadUrlResult>

  return (
    typeof candidate.bucket === 'string' &&
    typeof candidate.path === 'string' &&
    typeof candidate.maxImages === 'number' &&
    typeof candidate.remainingSlots === 'number' &&
    typeof candidate.signedUrl === 'string' &&
    typeof candidate.token === 'string'
  )
}

function isFinalizeResult(value: unknown): value is SubmissionImageFinalizeResult {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<SubmissionImageFinalizeResult>

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.storageBucket === 'string' &&
    typeof candidate.storagePath === 'string' &&
    typeof candidate.sortOrder === 'number'
  )
}

function parseFunctionError(error: unknown, fallback: string) {
  const context = (
    error &&
    typeof error === 'object' &&
    'context' in error
  )
    ? (error as { context?: Response }).context
    : undefined

  if (context instanceof Response) {
    return context
      .clone()
      .json()
      .then((payload) => {
        if (
          payload &&
          typeof payload === 'object' &&
          'error' in payload &&
          typeof payload.error === 'string' &&
          payload.error.trim()
        ) {
          return payload.error.trim()
        }

        return fallback
      })
      .catch(() => fallback)
  }

  if (error instanceof Error) {
    return Promise.resolve(error.message)
  }

  return Promise.resolve(fallback)
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

export async function requestSubmissionImageUpload(
  context: SubmissionImageUploadContext,
  file: File,
) {
  const { data, error } = await supabase.functions.invoke('submission-image-upload', {
    body: {
      action: 'prepare',
      submission_id: context.submissionId,
      submission_token: context.submissionToken,
      file_name: file.name,
      content_type: file.type,
      file_size: file.size,
    },
  })

  if (error) {
    throw new Error(
      await parseFunctionError(error, 'No pudimos preparar la subida de la imagen.'),
    )
  }

  if (isUploadUrlResult(data)) {
    return data
  }

  const result = data as { error?: string } | null
  throw new Error(result?.error || 'No pudimos preparar la subida de la imagen.')
}

export async function uploadSubmissionImageToStorage(
  bucket: string,
  path: string,
  token: string,
  file: File,
  onProgress?: (progress: number) => void,
) {
  onProgress?.(0)

  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, file)

  if (error) {
    throw new Error(error.message || 'No pudimos subir la imagen.')
  }

  onProgress?.(100)
}

export async function finalizeSubmissionImage(
  context: SubmissionImageUploadContext,
  storageBucket: string,
  storagePath: string,
  sortOrder: number,
) {
  const { data, error } = await supabase.functions.invoke('submission-image-upload', {
    body: {
      action: 'finalize',
      submission_id: context.submissionId,
      submission_token: context.submissionToken,
      storage_bucket: storageBucket,
      storage_path: storagePath,
      sort_order: sortOrder,
    },
  })

  if (error) {
    throw new Error(await parseFunctionError(error, 'No pudimos guardar la imagen.'))
  }

  if (isFinalizeResult(data)) {
    return data
  }

  const result = data as { error?: string } | null
  throw new Error(result?.error || 'No pudimos guardar la imagen.')
}
