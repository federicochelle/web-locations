import { NavLink } from 'react-router-dom'

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#14110f]/88 backdrop-blur">
      <div className="page-shell flex items-center py-4">
        <NavLink to="/" className="text-lg font-semibold text-brand-300 sm:text-xl">
          Film Locations UY
        </NavLink>
      </div>
    </header>
  )
}
