import { CategoryVisualCard } from '@/features/home/components/CategoryVisualCard.tsx'
import type { HomeCategoryCard } from '@/features/home/mocks/home.mock.ts'

type HomeCategoriesGridProps = {
  categories: HomeCategoryCard[]
}

export function HomeCategoriesGrid({
  categories,
}: HomeCategoriesGridProps) {
  return (
    <section className="space-y-5 sm:space-y-6">
      

      <div className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-10 2xl:px-14">
        <div className="mx-auto grid max-w-[1720px] gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {categories.map((category) => (
          <CategoryVisualCard key={category.id} category={category} />
        ))}
        </div>
      </div>
    </section>
  )
}
