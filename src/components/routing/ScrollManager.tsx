import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const INSTANT_SCROLL_BEHAVIOR = 'instant' as ScrollBehavior
const HASH_SCROLL_MAX_ATTEMPTS = 120

function findHashTarget(hash: string) {
  const decodedHash = decodeURIComponent(hash.replace(/^#/, '').trim())

  if (!decodedHash) {
    return null
  }

  const escapedHash = CSS.escape(decodedHash)

  return (
    document.getElementById(decodedHash) ??
    document.querySelector<HTMLElement>(`[name="${escapedHash}"]`)
  )
}

export function ScrollManager() {
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({
        top: 0,
        behavior: INSTANT_SCROLL_BEHAVIOR,
      })
      return
    }

    let animationFrameId = 0
    let attemptCount = 0

    function scrollToHashTarget() {
      const target = findHashTarget(location.hash)

      if (target) {
        target.scrollIntoView({
          block: 'start',
          inline: 'nearest',
        })
        return
      }

      if (attemptCount >= HASH_SCROLL_MAX_ATTEMPTS) {
        return
      }

      attemptCount += 1
      animationFrameId = window.requestAnimationFrame(scrollToHashTarget)
    }

    scrollToHashTarget()

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId)
      }
    }
  }, [location.hash, location.pathname, location.search])

  return null
}
