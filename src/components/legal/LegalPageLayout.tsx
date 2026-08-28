import type { ReactNode } from 'react'

type LegalPageLayoutProps = {
  title: string
  children: ReactNode
}

export function LegalPageLayout({ title, children }: LegalPageLayoutProps) {
  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-14 2xl:px-14">
      <div className="mx-auto max-w-[1720px]">
        <section className="mx-auto w-full max-w-5xl p-2 sm:p-4 lg:p-6">
          <div className="space-y-4">
            <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-300 sm:text-5xl">
              {title}
            </h1>
          </div>
          <div className="mt-8 max-w-3xl space-y-8 text-sm leading-7 text-brand-100/78 sm:text-base">
            {children}
          </div>
        </section>
      </div>
    </div>
  )
}
