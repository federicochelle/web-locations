import { createClient } from 'npm:@supabase/supabase-js@2'

export const MAX_SUBMISSION_IMAGE_COUNT = 8
export const MAX_SUBMISSION_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
export const SUBMISSION_IMAGE_STORAGE_BUCKET = 'location-submission-images'
export const ALLOWED_SUBMISSION_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]

export function getEnv(name: string) {
  const value = Deno.env.get(name)

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }

  return value
}

export function isAllowedSubmissionImageType(contentType: string) {
  return ALLOWED_SUBMISSION_IMAGE_TYPES.includes(contentType)
}

export function getSubmissionImageExtension(contentType: string) {
  switch (contentType) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/avif':
      return 'avif'
    default:
      return null
  }
}

export function buildSubmissionStoragePath(submissionId: string, contentType: string) {
  const extension = getSubmissionImageExtension(contentType)

  if (!extension) {
    throw new Error('unsupported_image_type')
  }

  return `submissions/${submissionId}/${crypto.randomUUID()}.${extension}`
}

export function isValidSubmissionStoragePath(submissionId: string, path: string) {
  const normalizedPath = path.trim()
  const expectedPrefix = `submissions/${submissionId}/`

  return (
    normalizedPath.startsWith(expectedPrefix) &&
    !normalizedPath.includes('..') &&
    normalizedPath.split('/').every((segment) => segment.length > 0)
  )
}

export function createServiceRoleSupabaseClient() {
  const supabaseUrl = getEnv('SUPABASE_URL')
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  })
}
