import { supabase } from '@/lib/supabase.ts'
import type { Category } from '@/types/location.ts'

type CategoryRow = {
  id: string
  name: string | null
  slug: string | null
  image_url: string | null
}

let cachedCategories: Category[] | null = null
let categoriesInFlight: Promise<Category[]> | null = null

export async function getCategories(): Promise<Category[]> {
  if (cachedCategories) {
    return cachedCategories
  }

  if (categoriesInFlight) {
    return categoriesInFlight
  }

  categoriesInFlight = (async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, image_url')
      .order('name')

    if (error) {
      throw new Error(error.message)
    }

    const categories = (data satisfies CategoryRow[]).map((category) => ({
      id: category.id,
      name: category.name ?? 'Categoria sin nombre',
      slug: category.slug ?? category.id,
      imageUrl: category.image_url,
    }))

    cachedCategories = categories
    return categories
  })()

  try {
    return await categoriesInFlight
  } finally {
    categoriesInFlight = null
  }
}
