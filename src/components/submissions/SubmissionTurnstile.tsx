import { useEffect, useRef, useState } from 'react'

type SubmissionTurnstileProps = {
  siteKey: string
  resetSignal: number
  errorMessage?: string | null
  onTokenChange: (token: string | null) => void
}

type TurnstileRenderOptions = {
  sitekey: string
  callback?: (token: string) => void
  'expired-callback'?: () => void
  'error-callback'?: () => void
  theme?: 'light' | 'dark' | 'auto'
}

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string
  reset: (widgetId?: string) => void
  remove: (widgetId?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const TURNSTILE_SCRIPT_ID = 'cloudflare-turnstile-script'

function loadTurnstileScript() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Turnstile no esta disponible en este entorno.'))
      return
    }

    if (window.turnstile) {
      resolve()
      return
    }

    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener(
        'error',
        () => reject(new Error('No pudimos cargar la verificacion anti-spam.')),
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.id = TURNSTILE_SCRIPT_ID
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener(
      'error',
      () => reject(new Error('No pudimos cargar la verificacion anti-spam.')),
      { once: true },
    )
    document.head.appendChild(script)
  })
}

export function SubmissionTurnstile({
  siteKey,
  resetSignal,
  errorMessage = null,
  onTokenChange,
}: SubmissionTurnstileProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!siteKey) {
      setLoadError('No pudimos cargar la verificacion anti-spam. Intenta nuevamente en unos minutos.')
      onTokenChange(null)
      return
    }

    void loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) {
          return
        }

        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current)
          widgetIdRef.current = null
        }

        setLoadError(null)
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'dark',
          callback: (token) => {
            onTokenChange(token)
          },
          'expired-callback': () => {
            onTokenChange(null)
            setLoadError('La verificacion anti-spam vencio. Intenta nuevamente.')
          },
          'error-callback': () => {
            onTokenChange(null)
            setLoadError('No pudimos validar la verificacion anti-spam. Intenta nuevamente.')
          },
        })
      })
      .catch((error) => {
        if (cancelled) {
          return
        }

        onTokenChange(null)
        setLoadError(error instanceof Error ? error.message : 'No pudimos cargar la verificacion anti-spam.')
      })

    return () => {
      cancelled = true
    }
  }, [siteKey, onTokenChange])

  useEffect(() => {
    if (!widgetIdRef.current || !window.turnstile) {
      return
    }

    window.turnstile.reset(widgetIdRef.current)
    onTokenChange(null)
    setLoadError(null)
  }, [onTokenChange, resetSignal])

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="min-h-[70px] overflow-hidden" />
      {loadError || errorMessage ? (
        <p className="text-sm text-red-200">{loadError || errorMessage}</p>
      ) : null}
    </div>
  )
}
