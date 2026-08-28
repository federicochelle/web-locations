import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

import { getEnv } from './submission-images.ts'

type TurnstileVerificationResult = {
  success: boolean
  'error-codes'?: string[]
}

export type PublicRateLimitResult = {
  allowed: boolean
  retryAfterSeconds: number
  currentCount: number
}

type RateLimitRow = {
  allowed?: boolean
  retry_after_seconds?: number
  current_count?: number
}

export function getClientIp(request: Request) {
  const cfConnectingIp = request.headers.get('cf-connecting-ip')?.trim()

  if (cfConnectingIp) {
    return cfConnectingIp
  }

  const xForwardedFor = request.headers.get('x-forwarded-for')?.trim()

  if (xForwardedFor) {
    const forwardedIp = xForwardedFor.split(',')[0]?.trim()

    if (forwardedIp) {
      return forwardedIp
    }
  }

  const realIp = request.headers.get('x-real-ip')?.trim()

  if (realIp) {
    return realIp
  }

  return null
}

export async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function buildRateLimitIdentifier(request: Request) {
  const clientIp = getClientIp(request)

  if (clientIp) {
    return sha256Hex(`ip:${clientIp}`)
  }

  const userAgent = request.headers.get('user-agent')?.trim() || 'unknown-user-agent'
  const origin = request.headers.get('origin')?.trim() || 'unknown-origin'

  return sha256Hex(`fallback:${origin}:${userAgent}`)
}

export async function consumePublicRateLimit(
  supabase: SupabaseClient,
  scope: string,
  identifierHash: string,
  windowSeconds: number,
  maxAttempts: number,
) {
  const { data, error } = await supabase.rpc('consume_public_form_rate_limit', {
    p_scope: scope,
    p_identifier_hash: identifierHash,
    p_window_seconds: windowSeconds,
    p_max_attempts: maxAttempts,
  })

  if (error) {
    throw new Error(error.message)
  }

  const row = (Array.isArray(data) ? data[0] : data) as RateLimitRow | null

  return {
    allowed: row?.allowed === true,
    retryAfterSeconds: Math.max(0, row?.retry_after_seconds ?? 0),
    currentCount: Math.max(0, row?.current_count ?? 0),
  } satisfies PublicRateLimitResult
}

export async function verifyTurnstileToken(token: string, clientIp: string | null) {
  const formData = new FormData()
  formData.append('secret', getEnv('TURNSTILE_SECRET_KEY'))
  formData.append('response', token)

  if (clientIp) {
    formData.append('remoteip', clientIp)
  }

  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      body: formData,
    },
  )

  let payload: TurnstileVerificationResult | null = null

  try {
    payload = (await response.json()) as TurnstileVerificationResult
  } catch {
    payload = null
  }

  return {
    ok: response.ok && payload?.success === true,
    errorCodes: payload?.['error-codes'] ?? [],
  }
}
