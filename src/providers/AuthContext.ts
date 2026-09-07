import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

import type {
  SubscriptionPlan,
  UserProfile,
  UserRole,
  UserSubscription,
} from '@/types/auth.ts'

export type ProfileState = 'idle' | 'loading' | 'ready' | 'missing' | 'error'

export type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  profileState: ProfileState
  canUsePrivateFeatures: boolean
  subscription: UserSubscription | null
  plan: SubscriptionPlan | null
  role: UserRole | null
  loading: boolean
  isAuthenticated: boolean
  hasActiveSubscription: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  refreshSubscription: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
