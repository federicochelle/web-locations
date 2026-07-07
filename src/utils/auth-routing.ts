import type { UserRole } from '@/types/auth.ts'

export function getDefaultRouteByRole(role: UserRole | null) {
  if (role === 'admin') {
    return '/admin'
  }

  if (role === 'visitor') {
    return '/dashboard'
  }

  return '/'
}
