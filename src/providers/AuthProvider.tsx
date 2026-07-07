import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'

import { AuthContext } from '@/providers/AuthContext.ts'
import type { AuthContextValue } from '@/providers/AuthContext.ts'
import {
  getSession,
  getSessionUser,
  getUserProfile,
  getUserSubscriptionWithPlan,
  onAuthStateChange,
  signOut as signOutFromService,
} from '@/services/auth.service.ts'
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
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const latestRequestId = useRef(0)

  const hydrateFromSession = useCallback(async (nextSession: Session | null) => {
    const requestId = ++latestRequestId.current
    const nextUser = getSessionUser(nextSession)

    setSession(nextSession)
    setUser(nextUser)
    setProfile(null)
    setSubscription(null)
    setPlan(null)

    if (!nextUser) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const [nextProfile, nextSubscriptionData] = await Promise.all([
        getUserProfile(nextUser.id),
        getUserSubscriptionWithPlan(nextUser.id),
      ])

      if (latestRequestId.current !== requestId) {
        return
      }

      setProfile(nextProfile)
      setSubscription(nextSubscriptionData.subscription)
      setPlan(nextSubscriptionData.plan)
    } finally {
      if (latestRequestId.current === requestId) {
        setLoading(false)
      }
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    const currentUser = getSessionUser(session)

    if (!currentUser) {
      setProfile(null)
      return
    }

    setLoading(true)

    try {
      const nextProfile = await getUserProfile(currentUser.id)
      setProfile(nextProfile)
    } finally {
      setLoading(false)
    }
  }, [session])

  const refreshSubscription = useCallback(async () => {
    const currentUser = getSessionUser(session)

    if (!currentUser) {
      setSubscription(null)
      setPlan(null)
      return
    }

    setLoading(true)

    try {
      const nextSubscriptionData = await getUserSubscriptionWithPlan(currentUser.id)
      setSubscription(nextSubscriptionData.subscription)
      setPlan(nextSubscriptionData.plan)
    } finally {
      setLoading(false)
    }
  }, [session])

  const signOut = useCallback(async () => {
    await signOutFromService()
  }, [])

  useEffect(() => {
    let isActive = true

    async function loadInitialSession() {
      try {
        const { session: initialSession } = await getSession()

        if (!isActive) {
          return
        }

        await hydrateFromSession(initialSession)
      } catch {
        if (isActive) {
          setSession(null)
          setUser(null)
          setProfile(null)
          setSubscription(null)
          setPlan(null)
          setLoading(false)
        }
      }
    }

    const {
      data: { subscription },
    } = onAuthStateChange((_, nextSession) => {
      void hydrateFromSession(nextSession)
    })

    void loadInitialSession()

    return () => {
      isActive = false
      latestRequestId.current += 1
      subscription.unsubscribe()
    }
  }, [hydrateFromSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
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
