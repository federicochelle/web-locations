import { supabase } from '@/lib/supabase.ts'

export type CreateLocationSubmissionInput = {
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  address: string
  description: string
  turnstileToken: string
}

export type CreateLocationSubmissionResult = {
  submissionId: string
  submissionToken: string
}

type CreateLocationSubmissionRpcRow = {
  submissionId?: string | null
  submissionToken?: string | null
}

function mapLocationSubmissionErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes('anti-spam')) {
    return 'No pudimos validar la verificacion anti-spam. Intenta nuevamente.'
  }

  if (
    normalizedMessage.includes('demasiados intentos') ||
    normalizedMessage.includes('too many requests')
  ) {
    return 'Recibimos demasiados intentos desde esta conexion. Intenta nuevamente en unos minutos.'
  }

  return 'No pudimos enviar la postulacion. Intenta nuevamente.'
}

async function getFunctionErrorMessage(error: unknown) {
  const context = (
    error &&
    typeof error === 'object' &&
    'context' in error
  )
    ? (error as { context?: Response }).context
    : undefined

  if (context instanceof Response) {
    try {
      const payload = await context.clone().json() as { error?: string }

      if (payload?.error) {
        return payload.error
      }
    } catch {
      return null
    }
  }

  return null
}

export async function getLocationSubmissionErrorMessage(error: unknown) {
  const functionErrorMessage = await getFunctionErrorMessage(error)

  if (functionErrorMessage) {
    return functionErrorMessage
  }

  if (error instanceof Error) {
    return mapLocationSubmissionErrorMessage(error.message)
  }

  return 'No pudimos enviar la postulacion. Intenta nuevamente.'
}

export async function createLocationSubmission(
  input: CreateLocationSubmissionInput,
) {
  const { data, error } = await supabase.functions.invoke('create-location-submission', {
    body: {
      owner_name: input.ownerName.trim(),
      owner_email: input.ownerEmail.trim(),
      owner_phone: input.ownerPhone.trim(),
      address: input.address.trim(),
      description: input.description.trim(),
      turnstile_token: input.turnstileToken.trim(),
    },
  })

  if (error) {
    throw error
  }

  const row = (Array.isArray(data) ? data[0] : data) as CreateLocationSubmissionRpcRow | null
  const submissionId = row?.submissionId?.trim()
  const submissionToken = row?.submissionToken?.trim()

  if (!submissionId || !submissionToken) {
    throw new Error('No pudimos confirmar la postulacion creada.')
  }

  return {
    submissionId,
    submissionToken,
  }
}
