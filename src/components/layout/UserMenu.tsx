import { useEffect, useId, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

type UserMenuProps = {
  displayName: string
  onSignOut: () => Promise<void>
}

export function UserMenu({ displayName, onSignOut }: UserMenuProps) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const menuId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function handleNavigate() {
    setIsOpen(false)
  }

  async function handleSignOut() {
    try {
      setIsSigningOut(true)
      setIsOpen(false)
      await onSignOut()
      navigate('/', { replace: true })
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => {
          setIsOpen((currentValue) => !currentValue)
        }}
        className="inline-flex min-h-10 max-w-[min(16rem,calc(100vw-8rem))] items-center justify-center rounded-full border border-white/10 px-4 text-sm font-medium text-brand-100 transition hover:bg-white/6"
      >
        <span className="truncate">{displayName}</span>
        <span className="ml-2 text-xs" aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-56 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#1b1613] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur"
        >
          <NavLink
            to="/favorites"
            role="menuitem"
            onClick={handleNavigate}
            className="flex min-h-11 items-center rounded-[1rem] px-4 text-sm text-brand-100 transition hover:bg-white/6"
          >
            Favoritos
          </NavLink>
          <NavLink
            to="/requests"
            role="menuitem"
            onClick={handleNavigate}
            className="flex min-h-11 items-center rounded-[1rem] px-4 text-sm text-brand-100 transition hover:bg-white/6"
          >
            Proyectos
          </NavLink>
          <NavLink
            to="/profile"
            role="menuitem"
            onClick={handleNavigate}
            className="flex min-h-11 items-center rounded-[1rem] px-4 text-sm text-brand-100 transition hover:bg-white/6"
          >
            Mi cuenta
          </NavLink>

          <div className="my-2 h-px bg-white/10" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void handleSignOut()
            }}
            disabled={isSigningOut}
            className="flex min-h-11 w-full items-center rounded-[1rem] px-4 text-left text-sm text-brand-100 transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSigningOut ? 'Cerrando...' : 'Cerrar sesion'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
