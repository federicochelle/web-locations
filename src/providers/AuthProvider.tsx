import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import * as Sentry from '@sentry/react'

import { AuthContext } from '@/providers/AuthContext.ts'
import type { AuthContextValue, ProfileState } from '@/providers/AuthContext.ts'
import {
  getSession,
  getSessionUser,
  getUserProfile,
  getProfileProductionCompany,
  getUserSubscriptionWithPlan,
  onAuthStateChange,
  signOut as signOutFromService,
} from '@/services/auth.service.ts'
import {
  clearPasswordRecoveryPending,
  markPasswordRecoveryPending,
} from '@/utils/password-recovery-session.ts'
import type {
  SubscriptionPlan,
  UserProfile,
  UserSubscription,
} from '@/types/auth.ts'

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileState, setProfileState] = useState<ProfileState>('loading')
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const latestRequestId = useRef(0)
  const currentSession = useRef<Session | null>(null)
  const signingOut = useRef(false)
  const reported = useRef(new Set<string>())
  const subscriptionRequestId = useRef(0)

  const report = useCallback((userId: string, state: string, error?: unknown) => {
    const key = `${userId}:${state}`
    if (reported.current.has(key)) return
    reported.current.add(key)
    const context = {
      user: { id: userId },
      tags: { auth_state: state, route: window.location.pathname },
    }
    if (state === 'missing') {
      Sentry.captureMessage('authenticated_user_without_profile', { ...context, level: 'warning' })
    } else {
      Sentry.captureException(error, context)
    }
  }, [])

  const loadSubscription = useCallback(async (userId: string, requestId: number) => {
    const subscriptionId = ++subscriptionRequestId.current
    try {
      const data = await getUserSubscriptionWithPlan(userId)
      if (latestRequestId.current !== requestId || subscriptionRequestId.current !== subscriptionId) return
      setSubscription(data.subscription)
      setPlan(data.plan)
      reported.current.delete(`${userId}:subscription_error`)
    } catch (error) {
      if (latestRequestId.current === requestId && subscriptionRequestId.current === subscriptionId) {
        report(userId, 'subscription_error', error)
      }
    }
  }, [report])

  const hydrateFromSession = useCallback(async (nextSession: Session | null) => {
    const requestId = ++latestRequestId.current
    const nextUser = getSessionUser(nextSession)
    if (currentSession.current?.user.id !== nextUser?.id) reported.current.clear()
    currentSession.current = nextSession
    setSession(nextSession)
    setUser(nextUser)
    Sentry.setUser(nextUser ? { id: nextUser.id } : null)
    setProfile(null)
    setSubscription(null)
    setPlan(null)
    setLoading(Boolean(nextUser))
    setProfileState(nextUser ? 'loading' : 'idle')
    if (!nextUser) return

    let nextProfile: UserProfile | null
    try {
      nextProfile = await getUserProfile(nextUser.id)
    } catch (error) {
      if (latestRequestId.current !== requestId) return
      setProfileState('error')
      setLoading(false)
      report(nextUser.id, 'profile_error', error)
      return
    }
    if (latestRequestId.current !== requestId) return
    setProfile(nextProfile)
    setProfileState(nextProfile ? 'ready' : 'missing')
    setLoading(false)
    if (!nextProfile) {
      report(nextUser.id, 'missing')
      return
    }
    reported.current.delete(`${nextUser.id}:missing`)
    reported.current.delete(`${nextUser.id}:profile_error`)
    if (nextProfile.status !== 'active') return

    // Secondary failures never remove a successfully loaded profile.
    void loadSubscription(nextUser.id, requestId)
    try {
      const enrichedProfile = await getProfileProductionCompany(nextProfile)
      if (latestRequestId.current !== requestId) return
      setProfile(enrichedProfile)
      reported.current.delete(`${nextUser.id}:company_error`)
    } catch (error) {
      if (latestRequestId.current === requestId) report(nextUser.id, 'company_error', error)
    }
  }, [loadSubscription, report])

  const refreshProfile = useCallback(async () => {
    if (!signingOut.current) await hydrateFromSession(currentSession.current)
  }, [hydrateFromSession])

  const refreshSubscription = useCallback(async () => {
    const currentUser = currentSession.current?.user
    if (currentUser && !signingOut.current) {
      await loadSubscription(currentUser.id, latestRequestId.current)
    }
  }, [loadSubscription])

  const signOut = useCallback(async () => {
    signingOut.current = true
    // Invalidate pending profile, dependency and initial-session responses immediately.
    latestRequestId.current += 1
    try {
      await signOutFromService()
      await hydrateFromSession(null)
    } catch (error) {
      if (profileState === 'loading') void hydrateFromSession(currentSession.current)
      throw error
    } finally {
      signingOut.current = false
    }
  }, [hydrateFromSession, profileState])

  useEffect(() => {
    let isActive = true
    const initialRequestId = latestRequestId.current
    const { data: { subscription: authSubscription } } = onAuthStateChange((event, nextSession) => {
      if (!isActive || (signingOut.current && event !== 'SIGNED_OUT')) return
      if (event === 'PASSWORD_RECOVERY' && nextSession) markPasswordRecoveryPending()
      if (event === 'SIGNED_OUT') clearPasswordRecoveryPending()
      void hydrateFromSession(nextSession)
    })

    void getSession().then(({ session: initialSession }) => {
      if (isActive && !signingOut.current && latestRequestId.current === initialRequestId) {
        void hydrateFromSession(initialSession)
      }
    }).catch((error: unknown) => {
      if (!isActive || latestRequestId.current !== initialRequestId) return
      Sentry.captureException(error, { tags: { auth_state: 'session_error' } })
      void hydrateFromSession(null)
    })

    return () => {
      isActive = false
      latestRequestId.current += 1
      authSubscription.unsubscribe()
    }
  }, [hydrateFromSession])

  const canUsePrivateFeatures = Boolean(user && profileState === 'ready' &&
    profile?.status === 'active' && profile.role && ['visitor', 'admin'].includes(profile.role))

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      profileState,
      canUsePrivateFeatures,
      subscription,
      plan,
      role: profile?.role ?? null,
      loading,
      isAuthenticated: Boolean(user),
      hasActiveSubscription: Boolean(
        subscription &&
          ['active', 'trialing', 'past_due'].includes(subscription.status),
      ),
      signOut,
      refreshProfile,
      refreshSubscription,
    }),
    [
      loading,
      plan,
      profile,
      profileState,
      canUsePrivateFeatures,
      refreshProfile,
      refreshSubscription,
      session,
      signOut,
      subscription,
      user,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
