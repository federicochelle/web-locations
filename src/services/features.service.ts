import { supabase } from '@/lib/supabase.ts'
import type { Feature } from '@/types/location.ts'

type FeatureRow = {
  id: string
  name: string | null
  slug: string | null
  group?: string | null
  type?: string | null
  active?: boolean | null
  aliases?: string[] | null
}

export async function getFeatures(): Promise<Feature[]> {
  const { data, error } = await supabase
    .from('features')
    .select('id, name, slug, group, type, active, aliases')
    .order('name')

  if (error) {
    throw new Error(error.message)
  }

  return (data satisfies FeatureRow[]).map((feature) => ({
    id: feature.id,
    name: feature.name ?? 'Feature sin nombre',
    slug: feature.slug ?? feature.id,
    group: feature.group ?? null,
    type: feature.type ?? null,
    active: feature.active ?? null,
    aliases: feature.aliases ?? [],
  }))
}
