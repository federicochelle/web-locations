import type {
  AuthChangeEvent,
  Session,
  User,
  VerifyOtpParams,
} from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase.ts'
import type {
  SubscriptionPlan,
  SubscriptionStatus,
  UserProfile,
  UserRole,
  UserStatus,
  UserSubscription,
} from '@/types/auth.ts'

export const AUTH_MIN_PASSWORD_LENGTH = 8

type SignUpInput = {
  fullName: string
  email: string
  password: string
}

type SignInInput = {
  email: string
  password: string
}

type RequestPasswordResetInput = {
  email: string
}

type UpdatePasswordInput = {
  password: string
}

type ProfileRow = {
  id: string
  user_id: string
  full_name: string | null
  company_name: string | null
  phone: string | null
  role: UserRole | null
  status: UserStatus | null
}

type UpdateProfileInput = {
  fullName: string
  companyName: string | null
  phone: string | null
}

type PlanRow = {
  id: string
  slug: string | null
  name: string | null
  price: number | string | null
  currency: string | null
  billing_period: string | null
  max_favorites: number | null
  max_requests: number | null
  max_proposals: number | null
}

type SubscriptionRow = {
  id: string
  status: SubscriptionStatus | null
  starts_at: string | null
  expires_at: string | null
  cancel_at_period_end: boolean | null
  plans?: PlanRow | PlanRow[] | null
}

function buildRedirectUrl(path: string) {
  return new URL(path, window.location.origin).toString()
}

function mapAuthErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes('invalid login credentials')) {
    return 'El correo electrónico o la contraseña no son correctos.'
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return 'Debés confirmar tu correo electrónico antes de iniciar sesión.'
  }

  if (normalizedMessage.includes('user already registered')) {
    return 'Ya existe una cuenta registrada con este email.'
  }

  if (
    normalizedMessage.includes('password should be at least') ||
    normalizedMessage.includes('password is too short')
  ) {
    return `La contraseña debe tener al menos ${AUTH_MIN_PASSWORD_LENGTH} caracteres.`
  }

  if (
    normalizedMessage.includes('for security purposes') &&
    normalizedMessage.includes('reset')
  ) {
    return 'Ya se solicitó un cambio de contraseña recientemente. Intentá de nuevo en unos minutos.'
  }

  if (normalizedMessage.includes('expired')) {
    return 'El enlace ya expiró. Solicitá uno nuevo.'
  }

  if (normalizedMessage.includes('invalid') && normalizedMessage.includes('token')) {
    return 'El enlace no es válido o ya fue utilizado.'
  }

  return 'Ocurrio un error al procesar tu solicitud. Intenta nuevamente.'
}

function mapProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    companyName: row.company_name,
    phone: row.phone,
    role: row.role,
    status: row.status,
  }
}

function getPlanRow(value: PlanRow | PlanRow[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function mapSubscriptionRecord(row: SubscriptionRow): {
  subscription: UserSubscription
  plan: SubscriptionPlan | null
} {
  const planRow = getPlanRow(row.plans)

  return {
    subscription: {
      id: row.id,
      status: row.status ?? 'expired',
      startsAt: row.starts_at ?? new Date(0).toISOString(),
      expiresAt: row.expires_at ?? null,
      cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
    },
    plan: planRow
      ? {
          id: planRow.id,
          slug: planRow.slug ?? planRow.id,
          name: planRow.name ?? 'Plan sin nombre',
          price: Number(planRow.price ?? 0),
          currency: planRow.currency ?? 'USD',
          billingPeriod: planRow.billing_period ?? 'free',
          maxFavorites: planRow.max_favorites ?? null,
          maxRequests: planRow.max_requests ?? null,
          maxProposals: planRow.max_proposals ?? null,
        }
      : null,
  }
}

export function getAuthErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return mapAuthErrorMessage(error.message)
  }

  return 'Ocurrio un error al procesar tu solicitud. Intenta nuevamente.'
}

export async function signUp({ fullName, email, password }: SignUpInput) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: buildRedirectUrl('/login?confirmed=1'),
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function signIn({ email, password }: SignInInput) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }
}

export async function requestPasswordReset({
  email,
}: RequestPasswordResetInput) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildRedirectUrl('/reset-password'),
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function updatePassword({ password }: UpdatePasswordInput) {
  const { data, error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, full_name, company_name, phone, role, status')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }

    throw new Error(error.message)
  }

  return mapProfile(data satisfies ProfileRow)
}

export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: input.fullName,
      company_name: input.companyName,
      phone: input.phone,
    })
    .eq('user_id', userId)
    .select('id, user_id, full_name, company_name, phone, role, status')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return mapProfile(data satisfies ProfileRow)
}

export async function getUserSubscriptionWithPlan(userId: string): Promise<{
  subscription: UserSubscription | null
  plan: SubscriptionPlan | null
}> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      `
        id,
        status,
        starts_at,
        expires_at,
        cancel_at_period_end,
        plans (
          id,
          slug,
          name,
          price,
          currency,
          billing_period,
          max_favorites,
          max_requests,
          max_proposals
        )
      `,
    )
    .eq('user_id', userId)
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    return {
      subscription: null,
      plan: null,
    }
  }

  return mapSubscriptionRecord(data satisfies SubscriptionRow)
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  return supabase.auth.onAuthStateChange(callback)
}

export function getSessionUser(session: Session | null): User | null {
  return session?.user ?? null
}

export async function exchangeCodeForSession(code: string) {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function verifyOtpWithTokenHash(
  params: Extract<VerifyOtpParams, { token_hash: string }>,
) {
  const { data, error } = await supabase.auth.verifyOtp(params)

  if (error) {
    throw new Error(error.message)
  }

  return data
}
