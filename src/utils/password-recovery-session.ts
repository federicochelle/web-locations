const PASSWORD_RECOVERY_SESSION_KEY = 'password-recovery-pending'

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

export function markPasswordRecoveryPending() {
  if (!canUseSessionStorage()) {
    return
  }

  window.sessionStorage.setItem(PASSWORD_RECOVERY_SESSION_KEY, '1')
}

export function clearPasswordRecoveryPending() {
  if (!canUseSessionStorage()) {
    return
  }

  window.sessionStorage.removeItem(PASSWORD_RECOVERY_SESSION_KEY)
}

export function hasPasswordRecoveryPending() {
  if (!canUseSessionStorage()) {
    return false
  }

  return window.sessionStorage.getItem(PASSWORD_RECOVERY_SESSION_KEY) === '1'
}
