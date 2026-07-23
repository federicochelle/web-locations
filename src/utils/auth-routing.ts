import type { UserRole } from '@/types/auth.ts'

export function getDefaultRouteByRole(role: UserRole | null) {
  if (role === 'admin') {
    return '/'
  }

  if (role === 'visitor') {
    return '/'
  }

  return '/'
}
