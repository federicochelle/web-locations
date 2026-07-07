export type UserRole = 'admin' | 'visitor'

export type UserStatus = 'active' | 'inactive' | 'blocked'

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'cancelled'
  | 'expired'

export type UserProfile = {
  id: string
  userId: string
  fullName: string | null
  companyName: string | null
  phone: string | null
  role: UserRole | null
  status: UserStatus | null
}

export type SubscriptionPlan = {
  id: string
  slug: string
  name: string
  price: number
  currency: string
  billingPeriod: string
  maxFavorites: number | null
  maxRequests: number | null
  maxProposals: number | null
}

export type UserSubscription = {
  id: string
  status: SubscriptionStatus
  startsAt: string
  expiresAt: string | null
  cancelAtPeriodEnd: boolean
}
