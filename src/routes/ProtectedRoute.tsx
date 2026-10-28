import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { ProfileRecovery } from '@/components/auth/ProfileRecovery.tsx'
import { AppLoading } from '@/components/ui/AppLoading.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import type { UserRole } from '@/types/auth.ts'
import { getDefaultRouteByRole } from '@/utils/auth-routing.ts'

type ProtectedRouteProps = {
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const location = useLocation()
  const { isAuthenticated, loading, profile, profileState, role, user } = useAuth()
  const userId = user?.id ?? null
  const isProfileLoading = loading || profileState === 'loading'
  const isAuthorized =
    !isProfileLoading &&
    isAuthenticated &&
    profileState === 'ready' &&
    profile?.status === 'active' &&
    (!allowedRoles || (role !== null && allowedRoles.includes(role)))
  // Last user this guard let through. A transient profile reload for that same user keeps
  // the Outlet mounted so UI state survives; any other user, sign-out or unauthorized
  // result clears it.
  const [validatedUserId, setValidatedUserId] = useState<string | null>(null)
  let nextValidatedUserId: string | null = null

  if (userId !== null && isAuthenticated) {
    if (isAuthorized) {
      nextValidatedUserId = userId
    } else if (isProfileLoading && validatedUserId === userId) {
      nextValidatedUserId = validatedUserId
    }
  }

  if (nextValidatedUserId !== validatedUserId) {
    setValidatedUserId(nextValidatedUserId)
  }

  if (isProfileLoading && nextValidatedUserId !== null) {
    return <Outlet />
  }

  if (isProfileLoading) {
    return (
      <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-14 2xl:px-14">
        <div className="mx-auto flex max-w-[1720px] justify-center">
          <AppLoading label="Cargando tu sesión..." className="w-full max-w-xl" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/login" state={{ from: location }} />
  }

  if (profileState === 'missing' || profileState === 'error' || !profile) {
    return <ProfileRecovery />
  }

  if (profile.status !== 'active') {
    return <ProfileRecovery unavailable />
  }

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate replace to={getDefaultRouteByRole(role)} />
  }

  return <Outlet />
}
