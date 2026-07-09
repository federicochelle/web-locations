import { createClient } from 'npm:@supabase/supabase-js@2'

export const MAX_SUBMISSION_IMAGE_COUNT = 8
export const MAX_SUBMISSION_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
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

export function getCloudflareApiToken() {
  return getEnv('CLOUDFLARE_API_TOKEN')
}

export function getCloudflareDeliveryUrl() {
  return getEnv('CLOUDFLARE_DELIVERY_URL')
}
