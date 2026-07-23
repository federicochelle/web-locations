import { useEffect, useRef, useState } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'

type ScrollRevealProps = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'section'
  children: ReactNode
}

export function ScrollReveal({
  as = 'div',
  children,
  className = '',
  ...props
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false)
  const elementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    if (mediaQuery.matches) {
      setIsVisible(true)
      return
    }

    const currentElement = elementRef.current

    if (!currentElement) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return
        }

        setIsVisible(true)
        observer.disconnect()
      },
      {
        threshold: 0.18,
        rootMargin: '0px 0px -10% 0px',
      },
    )

    observer.observe(currentElement)

    return () => {
      observer.disconnect()
    }
  }, [])

  const revealClassName = `transition-all duration-700 ease-out motion-reduce:transition-none ${
    isVisible
      ? 'translate-y-0 opacity-100'
      : 'translate-y-8 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100'
  } ${className}`
  const setElementRef = (node: HTMLElement | null) => {
    elementRef.current = node
  }

  if (as === 'section') {
    return (
      <section
        ref={setElementRef}
        className={revealClassName}
        {...props}
      >
        {children}
      </section>
    )
  }

  return (
    <div
      ref={setElementRef}
      className={revealClassName}
      {...props}
    >
      {children}
    </div>
  )
}
