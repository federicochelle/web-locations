import { corsHeaders, createJsonResponse } from '../_shared/cors.ts'
import {
  buildRateLimitIdentifier,
  consumePublicRateLimit,
  getClientIp,
  verifyTurnstileToken,
} from '../_shared/public-form-security.ts'
import { createServiceRoleSupabaseClient } from '../_shared/submission-images.ts'

type CreateSubmissionRequest = {
  owner_name?: string
  owner_email?: string
  owner_phone?: string
  address?: string
  description?: string
  turnstile_token?: string
}

type CreateSubmissionRpcRow = {
  id?: string | null
  submission_token?: string | null
}

const CREATE_SUBMISSION_RATE_LIMIT_WINDOW_SECONDS = 60 * 60
const CREATE_SUBMISSION_RATE_LIMIT_MAX_ATTEMPTS = 6

function getUserFacingCreateErrorMessage(message: string) {
  const normalizedMessage = message.trim()
  const knownMessages = new Set([
    'Ingresa tu nombre.',
    'Ingresa un nombre valido.',
    'El nombre es demasiado largo.',
    'Ingresa tu email.',
    'Ingresa un email valido.',
    'El email es demasiado largo.',
    'Ingresa tu telefono.',
    'Ingresa un telefono valido.',
    'El telefono es demasiado largo.',
    'Ingresa la ubicacion de la locacion.',
    'La ubicacion es demasiado larga.',
    'Agrega una descripcion de la locacion.',
    'La descripcion es demasiado larga.',
  ])

  if (knownMessages.has(normalizedMessage)) {
    return normalizedMessage
  }

  return 'No pudimos enviar la postulacion. Intenta nuevamente.'
}

function logError(stage: string, details: Record<string, unknown>) {
  console.error('[create-location-submission]', {
    stage,
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
    const body = (await request.json()) as CreateSubmissionRequest
    const turnstileToken = body.turnstile_token?.trim() || ''

    if (!turnstileToken) {
      return createJsonResponse(
        { error: 'Confirma que no eres un bot e intenta nuevamente.' },
        400,
      )
    }

    const supabase = createServiceRoleSupabaseClient()
    const identifierHash = await buildRateLimitIdentifier(request)
    const rateLimit = await consumePublicRateLimit(
      supabase,
      'create_location_submission',
      identifierHash,
      CREATE_SUBMISSION_RATE_LIMIT_WINDOW_SECONDS,
      CREATE_SUBMISSION_RATE_LIMIT_MAX_ATTEMPTS,
    )

    if (!rateLimit.allowed) {
      return createJsonResponse(
        {
          error:
            'Recibimos demasiados intentos desde esta conexion. Intenta nuevamente en unos minutos.',
        },
        429,
      )
    }

    const clientIp = getClientIp(request)
    const turnstileVerification = await verifyTurnstileToken(turnstileToken, clientIp)

    if (!turnstileVerification.ok) {
      logError('turnstile_verification_failed', {
        errorCodes: turnstileVerification.errorCodes,
        hasClientIp: Boolean(clientIp),
      })

      return createJsonResponse(
        { error: 'No pudimos validar la verificacion anti-spam. Intenta nuevamente.' },
        400,
      )
    }

    const { data, error } = await supabase.rpc('create_location_submission', {
      p_owner_name: body.owner_name ?? '',
      p_owner_email: body.owner_email ?? '',
      p_owner_phone: body.owner_phone ?? '',
      p_address: body.address ?? '',
      p_description: body.description ?? '',
    })

    if (error) {
      logError('rpc_error', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })

      const userMessage = getUserFacingCreateErrorMessage(error.message)
      const status = userMessage === 'No pudimos enviar la postulacion. Intenta nuevamente.'
        ? 500
        : 400

      return createJsonResponse({ error: userMessage }, status)
    }

    const row = (Array.isArray(data) ? data[0] : data) as CreateSubmissionRpcRow | null
    const submissionId = row?.id?.trim()
    const submissionToken = row?.submission_token?.trim()

    if (!submissionId || !submissionToken) {
      logError('rpc_invalid_payload', {
        hasSubmissionId: Boolean(submissionId),
        hasSubmissionToken: Boolean(submissionToken),
      })

      return createJsonResponse(
        { error: 'No pudimos confirmar la postulacion creada.' },
        500,
      )
    }

    return createJsonResponse({
      submissionId,
      submissionToken,
    })
  } catch (error) {
    logError('unexpected_error', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    return createJsonResponse(
      { error: 'No pudimos enviar la postulacion. Intenta nuevamente.' },
      500,
    )
  }
})
