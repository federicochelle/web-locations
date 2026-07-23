import type { ReactNode } from 'react'

type AuthPageShellProps = {
  title: string
  children: ReactNode
}

export function AuthPageShell({ title, children }: AuthPageShellProps) {
  return (
    <section className="w-full text-brand-100">
      <div className="mb-8 text-center">
        <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-100">
          {title}
        </h1>
      </div>

      {children}
    </section>
  )
}
