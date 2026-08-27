import { CategoryVisualCard } from '@/features/home/components/CategoryVisualCard.tsx'
import type { HomeCategoryCard } from '@/features/home/mocks/home.mock.ts'

type HomeCategoriesGridProps = {
  categories: HomeCategoryCard[]
  onCriticalImageSettled?: () => void
}

export function HomeCategoriesGrid({
  categories,
  onCriticalImageSettled,
}: HomeCategoriesGridProps) {
  const criticalImageCount = Math.min(
    categories.length,
    typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
      ? 2
      : 4,
  )

  return (
    <section className="space-y-5 sm:space-y-6">
      <div className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-10 2xl:px-14">
        <div className="mx-auto grid max-w-[1720px] gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {categories.map((category, index) => (
            <CategoryVisualCard
              key={category.id}
              category={category}
              imageLoading={index < 4 ? 'eager' : 'lazy'}
              imageFetchPriority={index < 2 ? 'high' : 'auto'}
              onImageSettled={index < criticalImageCount ? onCriticalImageSettled : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
