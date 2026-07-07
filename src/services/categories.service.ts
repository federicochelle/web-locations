import { supabase } from '@/lib/supabase.ts'
import type { Category } from '@/types/location.ts'

type CategoryRow = {
  id: string
  name: string | null
  slug: string | null
  image_url: string | null
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, image_url')
    .order('name')

  if (error) {
    throw new Error(error.message)
  }

  return (data satisfies CategoryRow[]).map((category) => ({
    id: category.id,
    name: category.name ?? 'Categoria sin nombre',
    slug: category.slug ?? category.id,
    imageUrl: category.image_url,
  }))
}
