import { supabase } from '@/lib/supabase.ts'

export type CreateLocationSubmissionInput = {
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  title: string
  address: string
  description: string
}

export type CreateLocationSubmissionResult = {
  submissionId: string
  submissionToken: string
}

type CreateLocationSubmissionRpcRow = {
  id?: string | null
  submission_token?: string | null
}

function mapLocationSubmissionErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase()

  if (
    normalizedMessage.includes('invalid input syntax') ||
    normalizedMessage.includes('violates')
  ) {
    return 'Revisa los datos ingresados e intenta nuevamente.'
  }

  return 'No pudimos enviar la postulacion. Intenta nuevamente.'
}

export function getLocationSubmissionErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return mapLocationSubmissionErrorMessage(error.message)
  }

  return 'No pudimos enviar la postulacion. Intenta nuevamente.'
}

export async function createLocationSubmission(
  input: CreateLocationSubmissionInput,
) {
  const { data, error } = await supabase.rpc('create_location_submission', {
    p_owner_name: input.ownerName.trim(),
    p_owner_email: input.ownerEmail.trim(),
    p_owner_phone: input.ownerPhone.trim(),
    p_title: input.title.trim(),
    p_department: null,
    p_zone: null,
    p_address: input.address.trim() || null,
    p_location_type: null,
    p_description: input.description.trim() || null,
    p_message: null,
  })

  if (error) {
    throw new Error(error.message)
  }

  const row = (Array.isArray(data) ? data[0] : data) as CreateLocationSubmissionRpcRow | null
  const submissionId = row?.id?.trim()
  const submissionToken = row?.submission_token?.trim()

  if (!submissionId || !submissionToken) {
    throw new Error('No pudimos confirmar la postulacion creada.')
  }

  return {
    submissionId,
    submissionToken,
  }
}
