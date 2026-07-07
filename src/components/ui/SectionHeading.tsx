type SectionHeadingProps = {
  eyebrow?: string
  title: string
  description?: string
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: SectionHeadingProps) {
  return (
    <div className="space-y-3">
      {eyebrow ? (
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-brand-700">
          {eyebrow}
        </p>
      ) : null}
      <div className="space-y-2">
        <h2 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-950 sm:text-5xl">
          {title}
        </h2>
        {description ? (
          <p className="max-w-3xl text-sm leading-6 text-sand-700 sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  )
}
