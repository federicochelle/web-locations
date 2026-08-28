import { corsHeaders, createJsonResponse } from '../_shared/cors.ts'
import {
  buildRateLimitIdentifier,
  consumePublicRateLimit,
} from '../_shared/public-form-security.ts'
import {
  buildSubmissionStoragePath,
  createServiceRoleSupabaseClient,
  isAllowedSubmissionImageType,
  isValidSubmissionStoragePath,
  MAX_SUBMISSION_IMAGE_COUNT,
  MAX_SUBMISSION_IMAGE_SIZE_BYTES,
  SUBMISSION_IMAGE_STORAGE_BUCKET,
} from '../_shared/submission-images.ts'

type PrepareUploadRequest = {
  action: 'prepare'
  submission_id?: string
  submission_token?: string
  file_name?: string
  content_type?: string
  file_size?: number
}

type FinalizeUploadRequest = {
  action: 'finalize'
  submission_id?: string
  submission_token?: string
  storage_bucket?: string
  storage_path?: string
  sort_order?: number
}

type SubmissionImageUploadRequest = PrepareUploadRequest | FinalizeUploadRequest

type FinalizeImageRpcRow = {
  id?: string | null
  storage_bucket?: string | null
  storage_path?: string | null
  sort_order?: number | null
}

type StorageObjectMetadata = {
  mimetype?: string | null
  mimeType?: string | null
  contentType?: string | null
  size?: number | null
}

const PREPARE_RATE_LIMIT_WINDOW_SECONDS = 15 * 60
const PREPARE_RATE_LIMIT_MAX_ATTEMPTS = 24
const FINALIZE_RATE_LIMIT_WINDOW_SECONDS = 15 * 60
const FINALIZE_RATE_LIMIT_MAX_ATTEMPTS = 24

function logError(stage: string, details: Record<string, unknown>) {
  console.error('[submission-image-upload]', {
    stage,
    ...details,
  })
}

function readStorageObjectMimeType(storageObject: {
  contentType?: string | null
  content_type?: string | null
  metadata?: StorageObjectMetadata | null
}) {
  const camelContentType = storageObject.contentType?.trim()

  if (camelContentType) {
    return camelContentType
  }

  const directContentType = storageObject.content_type?.trim()

  if (directContentType) {
    return directContentType
  }

  const metadataContentType = storageObject.metadata?.contentType?.trim()

  if (metadataContentType) {
    return metadataContentType
  }

  const metadataMimeTypeCamel = storageObject.metadata?.mimeType?.trim()

  if (metadataMimeTypeCamel) {
    return metadataMimeTypeCamel
  }

  const metadataMimeType = storageObject.metadata?.mimetype?.trim()

  if (metadataMimeType) {
    return metadataMimeType
  }

  return ''
}

function readStorageObjectSize(storageObject: {
  size?: number | null
  metadata?: StorageObjectMetadata | null
}) {
  const metadataSize = storageObject.metadata?.size

  if (typeof metadataSize === 'number' && Number.isFinite(metadataSize)) {
    return metadataSize
  }

  const directSize = storageObject.size

  if (typeof directSize === 'number' && Number.isFinite(directSize)) {
    return directSize
  }

  return 0
}

async function getValidatedSubmission(
  submissionId: string,
  submissionToken: string,
) {
  const supabase = createServiceRoleSupabaseClient()
  const { data, error } = await supabase
    .from('location_submissions')
    .select('id, submission_token')
    .eq('id', submissionId)
    .maybeSingle()

  if (error) {
    throw new Error('submission_query_failed')
  }

  if (!data || data.submission_token !== submissionToken) {
    return null
  }

  return {
    supabase,
    submission: data,
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return createJsonResponse({ error: 'Metodo no permitido.' }, 405)
  }

  try {
    const body = (await request.json()) as SubmissionImageUploadRequest
    const action = body.action

    if (action !== 'prepare' && action !== 'finalize') {
      return createJsonResponse({ error: 'Accion no permitida.' }, 400)
    }

    const submissionId = body.submission_id?.trim()
    const submissionToken = body.submission_token?.trim()

    if (!submissionId || !submissionToken) {
      return createJsonResponse({ error: 'La postulacion no es valida.' }, 403)
    }

    const validatedSubmission = await getValidatedSubmission(submissionId, submissionToken)

    if (!validatedSubmission) {
      return createJsonResponse({ error: 'La postulacion no es valida.' }, 403)
    }

    const { supabase } = validatedSubmission
    const identifierHash = await buildRateLimitIdentifier(request)

    if (action === 'prepare') {
      const fileName = body.file_name?.trim()
      const contentType = body.content_type?.trim() || ''
      const fileSize = body.file_size ?? 0

      if (!fileName) {
        return createJsonResponse({ error: 'Faltan datos para preparar la imagen.' }, 400)
      }

      if (fileName.length > 255) {
        return createJsonResponse({ error: 'El archivo no es valido.' }, 400)
      }

      if (!isAllowedSubmissionImageType(contentType)) {
        return createJsonResponse(
          { error: 'El formato de imagen no es valido.' },
          400,
        )
      }

      if (!Number.isFinite(fileSize) || fileSize <= 0) {
        return createJsonResponse({ error: 'El archivo no es valido.' }, 400)
      }

      if (fileSize > MAX_SUBMISSION_IMAGE_SIZE_BYTES) {
        return createJsonResponse(
          { error: 'Cada imagen debe pesar como maximo 10 MB.' },
          400,
        )
      }

      const rateLimit = await consumePublicRateLimit(
        supabase,
        'submission_image_upload_prepare',
        identifierHash,
        PREPARE_RATE_LIMIT_WINDOW_SECONDS,
        PREPARE_RATE_LIMIT_MAX_ATTEMPTS,
      )

      if (!rateLimit.allowed) {
        return createJsonResponse(
          {
            error:
              'Recibimos demasiados intentos con imagenes desde esta conexion. Intenta nuevamente en unos minutos.',
          },
          429,
        )
      }

      const { count, error } = await supabase
        .from('location_submission_images')
        .select('id', { count: 'exact', head: true })
        .eq('submission_id', submissionId)

      if (error) {
        throw new Error('image_count_query_failed')
      }

      if ((count ?? 0) >= MAX_SUBMISSION_IMAGE_COUNT) {
        return createJsonResponse(
          { error: 'Esta postulacion ya alcanzo el maximo de 8 imagenes.' },
          409,
        )
      }

      const storagePath = buildSubmissionStoragePath(submissionId, contentType)
      const { data, error: signedUrlError } = await supabase
        .storage
        .from(SUBMISSION_IMAGE_STORAGE_BUCKET)
        .createSignedUploadUrl(storagePath)

      if (signedUrlError || !data?.path || !data.token || !data.signedUrl) {
        logError('signed_upload_url_failed', {
          message: signedUrlError?.message,
          submissionId,
          storagePath,
        })
        return createJsonResponse(
          { error: 'No pudimos preparar la subida en este momento.' },
          502,
        )
      }

      return createJsonResponse({
        bucket: SUBMISSION_IMAGE_STORAGE_BUCKET,
        path: data.path,
        token: data.token,
        signedUrl: data.signedUrl,
        maxImages: MAX_SUBMISSION_IMAGE_COUNT,
        remainingSlots: Math.max(0, MAX_SUBMISSION_IMAGE_COUNT - (count ?? 0)),
      })
    }

    const storageBucket = body.storage_bucket?.trim()
    const storagePath = body.storage_path?.trim()
    const sortOrder =
      typeof body.sort_order === 'number' && Number.isFinite(body.sort_order)
        ? Math.max(0, Math.trunc(body.sort_order))
        : 0

    if (
      !storageBucket ||
      !storagePath ||
      storageBucket !== SUBMISSION_IMAGE_STORAGE_BUCKET ||
      !isValidSubmissionStoragePath(submissionId, storagePath)
    ) {
      return createJsonResponse({ error: 'La imagen subida no es valida.' }, 400)
    }

    const rateLimit = await consumePublicRateLimit(
      supabase,
      'submission_image_upload_finalize',
      identifierHash,
      FINALIZE_RATE_LIMIT_WINDOW_SECONDS,
      FINALIZE_RATE_LIMIT_MAX_ATTEMPTS,
    )

    if (!rateLimit.allowed) {
      return createJsonResponse(
        {
          error:
            'Recibimos demasiados intentos con imagenes desde esta conexion. Intenta nuevamente en unos minutos.',
        },
        429,
      )
    }

    const { data: existingImage, error: existingImageError } = await supabase
      .from('location_submission_images')
      .select('id, storage_bucket, storage_path, sort_order')
      .eq('submission_id', submissionId)
      .eq('storage_path', storagePath)
      .maybeSingle()

    if (existingImageError) {
      throw new Error('existing_image_query_failed')
    }

    if (existingImage) {
      return createJsonResponse({
        id: existingImage.id as string,
        storageBucket: existingImage.storage_bucket as string,
        storagePath: existingImage.storage_path as string,
        sortOrder: existingImage.sort_order as number,
      })
    }

    const { data: storageObject, error: storageInfoError } = await supabase
      .storage
      .from(storageBucket)
      .info(storagePath)

    if (storageInfoError || !storageObject) {
      return createJsonResponse(
        { error: 'No pudimos validar la imagen subida.' },
        400,
      )
    }

    const contentType = readStorageObjectMimeType(storageObject)
    const objectSize = readStorageObjectSize(storageObject)

    if (!isAllowedSubmissionImageType(contentType)) {
      return createJsonResponse(
        { error: 'El formato de imagen no es valido.' },
        400,
      )
    }

    if (!Number.isFinite(objectSize) || objectSize <= 0 || objectSize > MAX_SUBMISSION_IMAGE_SIZE_BYTES) {
      return createJsonResponse(
        { error: 'Cada imagen debe pesar como maximo 10 MB.' },
        400,
      )
    }

    const { data, error } = await supabase.rpc(
      'finalize_location_submission_storage_image',
      {
        p_submission_id: submissionId,
        p_submission_token: submissionToken,
        p_storage_bucket: storageBucket,
        p_storage_path: storagePath,
        p_sort_order: sortOrder,
      },
    )

    if (error) {
      const normalizedMessage = error.message.trim()

      if (
        normalizedMessage === 'La postulacion no es valida.' ||
        normalizedMessage === 'Esta postulacion ya alcanzo el maximo de 8 imagenes.' ||
        normalizedMessage === 'No pudimos validar la imagen subida.' ||
        normalizedMessage === 'No pudimos guardar la imagen.'
      ) {
        return createJsonResponse({ error: normalizedMessage }, 400)
      }

      throw new Error('finalize_storage_image_failed')
    }

    const row = (Array.isArray(data) ? data[0] : data) as FinalizeImageRpcRow | null

    if (
      !row?.id ||
      !row.storage_bucket ||
      !row.storage_path ||
      typeof row.sort_order !== 'number'
    ) {
      throw new Error('invalid_finalize_payload')
    }

    return createJsonResponse({
      id: row.id,
      storageBucket: row.storage_bucket,
      storagePath: row.storage_path,
      sortOrder: row.sort_order,
    })
  } catch (error) {
    logError('unexpected_error', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    return createJsonResponse({ error: 'No pudimos guardar la imagen.' }, 500)
  }
})
