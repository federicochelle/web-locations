type TagProps = {
  label: string
}

export function Tag({ label }: TagProps) {
  return (
    <span className="inline-flex rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-brand-700">
      {label}
    </span>
  )
}
