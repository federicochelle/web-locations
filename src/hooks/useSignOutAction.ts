import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth.ts'

export function useSignOutAction() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const executeSignOut = useCallback(async () => {
    setIsSigningOut(true)

    try {
      await signOut()
      navigate('/', { replace: true })
    } finally {
      setIsSigningOut(false)
    }
  }, [navigate, signOut])

  return {
    isSigningOut,
    executeSignOut,
  }
}
