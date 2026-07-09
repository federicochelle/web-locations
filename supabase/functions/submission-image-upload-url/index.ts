import { corsHeaders, createJsonResponse } from '../_shared/cors.ts'
import {
  createServiceRoleSupabaseClient,
  getCloudflareApiToken,
  getEnv,
  isAllowedSubmissionImageType,
  MAX_SUBMISSION_IMAGE_COUNT,
  MAX_SUBMISSION_IMAGE_SIZE_BYTES,
} from '../_shared/submission-images.ts'

type UploadUrlRequest = {
  submission_id?: string
  submission_token?: string
  file_name?: string
  content_type?: string
  file_size?: number
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'No pudimos preparar la subida de la imagen.'
}

function logValidationFailure(details: Record<string, unknown>) {
  console.error('[submission-image-upload-url]', {
    stage: 'validation',
    ...details,
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return createJsonResponse({ error: 'Metodo no permitido.' }, 405)
  }

  try {
    const body = (await request.json()) as UploadUrlRequest
    const submissionId = body.submission_id?.trim()
    const submissionToken = body.submission_token?.trim()
    const fileName = body.file_name?.trim()
    const contentType = body.content_type?.trim() || ''
    const fileSize = body.file_size ?? 0

    if (!submissionId || !submissionToken || !fileName) {
      logValidationFailure({
        reason: 'missing_required_fields',
        hasSubmissionId: Boolean(submissionId),
        hasSubmissionToken: Boolean(submissionToken),
        hasFileName: Boolean(fileName),
      })
      return createJsonResponse({ error: 'Faltan datos para preparar la imagen.' }, 400)
    }

    if (!isAllowedSubmissionImageType(contentType)) {
      logValidationFailure({
        reason: 'invalid_content_type',
        contentType,
      })
      return createJsonResponse({ error: 'El formato de imagen no es valido.' }, 400)
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      logValidationFailure({
        reason: 'invalid_file_size',
        fileSize,
      })
      return createJsonResponse({ error: 'El archivo no es valido.' }, 400)
    }

    if (fileSize > MAX_SUBMISSION_IMAGE_SIZE_BYTES) {
      logValidationFailure({
        reason: 'file_too_large',
        fileSize,
        maxAllowedBytes: MAX_SUBMISSION_IMAGE_SIZE_BYTES,
      })
      return createJsonResponse(
        { error: 'Cada imagen debe pesar como maximo 10 MB.' },
        400,
      )
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: submission, error: submissionError } = await supabase
      .from('location_submissions')
      .select('id, submission_token')
      .eq('id', submissionId)
      .maybeSingle()

    if (submissionError) {
      console.error('[submission-image-upload-url]', {
        stage: 'submission_lookup',
        reason: 'submission_query_failed',
        message: submissionError.message,
        code: submissionError.code,
        details: submissionError.details,
        hint: submissionError.hint,
      })
      throw new Error(submissionError.message)
    }

    if (!submission || submission.submission_token !== submissionToken) {
      console.error('[submission-image-upload-url]', {
        stage: 'submission_lookup',
        reason: 'submission_not_valid',
        hasSubmission: Boolean(submission),
        tokenMatches: submission?.submission_token === submissionToken,
      })
      return createJsonResponse({ error: 'La postulacion no es valida.' }, 403)
    }

    const { count, error: countError } = await supabase
      .from('location_submission_images')
      .select('id', { count: 'exact', head: true })
      .eq('submission_id', submissionId)

    if (countError) {
      console.error('[submission-image-upload-url]', {
        stage: 'image_count',
        reason: 'count_query_failed',
        message: countError.message,
        code: countError.code,
        details: countError.details,
        hint: countError.hint,
      })
      throw new Error(countError.message)
    }

    if ((count ?? 0) >= MAX_SUBMISSION_IMAGE_COUNT) {
      console.error('[submission-image-upload-url]', {
        stage: 'image_count',
        reason: 'image_limit_reached',
        count,
        maxAllowed: MAX_SUBMISSION_IMAGE_COUNT,
      })
      return createJsonResponse(
        { error: 'Esta postulacion ya alcanzo el maximo de 8 imagenes.' },
        409,
      )
    }

    const cloudflareUrl = `https://api.cloudflare.com/client/v4/accounts/${getEnv('CLOUDFLARE_ACCOUNT_ID')}/images/v2/direct_upload`
    const cloudflareMethod = 'POST'
    let cloudflareResponse: Response

    try {
      const formData = new FormData()
      formData.append('requireSignedURLs', 'false')
      formData.append(
        'metadata',
        JSON.stringify({
          submissionId,
          fileName,
        }),
      )

      cloudflareResponse = await fetch(cloudflareUrl, {
        method: cloudflareMethod,
        headers: {
          Authorization: `Bearer ${getCloudflareApiToken()}`,
        },
        body: formData,
      })
    } catch (error) {
      console.error('[submission-image-upload-url]', {
        stage: 'cloudflare_fetch',
        url: cloudflareUrl,
        method: cloudflareMethod,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        cause:
          error instanceof Error && 'cause' in error
            ? (error as Error & { cause?: unknown }).cause
            : undefined,
      })

      return createJsonResponse(
        { error: 'No pudimos preparar la subida en este momento.' },
        502,
      )
    }

    const responseText = await cloudflareResponse.text()
    let cloudflareData: unknown = null

    try {
      cloudflareData = responseText ? JSON.parse(responseText) : null
    } catch {
      cloudflareData = null
    }

    if (!cloudflareResponse.ok || !(cloudflareData as { success?: boolean } | null)?.success) {
      console.error('[submission-image-upload-url]', {
        stage: 'cloudflare_response',
        url: cloudflareUrl,
        method: cloudflareMethod,
        status: cloudflareResponse.status,
        statusText: cloudflareResponse.statusText,
        headers: Object.fromEntries(cloudflareResponse.headers.entries()),
        body: responseText,
      })

      return createJsonResponse(
        { error: 'No pudimos preparar la subida en este momento.' },
        502,
      )
    }

    return createJsonResponse({
      uploadUrl: (cloudflareData as { result: { uploadURL: string } }).result.uploadURL,
      cloudflareImageId: (cloudflareData as { result: { id: string } }).result.id,
      maxImages: MAX_SUBMISSION_IMAGE_COUNT,
      remainingSlots: Math.max(0, MAX_SUBMISSION_IMAGE_COUNT - (count ?? 0)),
    })
  } catch (error) {
    console.error('[submission-image-upload-url]', {
      stage: 'unexpected_error',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      cause:
        error instanceof Error && 'cause' in error
          ? (error as Error & { cause?: unknown }).cause
          : undefined,
    })

    return createJsonResponse({ error: getErrorMessage(error) }, 500)
  }
})
