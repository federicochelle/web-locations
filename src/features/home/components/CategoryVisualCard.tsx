import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'

import type { HomeCategoryCard } from '@/features/home/mocks/home.mock.ts'

type CategoryVisualCardProps = {
  category: HomeCategoryCard
}

export function CategoryVisualCard({ category }: CategoryVisualCardProps) {
  const backgroundStyle = {
    backgroundImage: category.imageStyle,
  } satisfies CSSProperties

  return (
    <Link
      to={category.slug ? `/locations?category=${category.slug}` : '/locations'}
      aria-label={`Explorar categoria ${category.name}`}
      style={backgroundStyle}
      className="group relative flex aspect-[16/13] overflow-hidden rounded-[1.75rem] bg-brand-950 p-5 transition hover:-translate-y-0.5 lg:aspect-[16/12]"
    >
      {category.imageUrl ? (
        <img
          src={category.imageUrl}
          alt={category.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.08)_40%,rgba(0,0,0,0.38)_100%)] transition group-hover:scale-[1.02]" />
      <div className="relative mt-auto">
        <h3 className="font-display text-3xl leading-none text-white">
          {category.name}
        </h3>
      </div>
    </Link>
  )
}
