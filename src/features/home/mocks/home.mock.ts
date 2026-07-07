export type HomeCategoryCard = {
  id: string
  name: string
  slug: string
  imageUrl?: string | null
  imageStyle: string
}

const categoryBackgrounds = [
  'linear-gradient(180deg, rgba(10, 10, 10, 0.08), rgba(10, 10, 10, 0.72)), linear-gradient(135deg, #8f6b55 0%, #47362d 48%, #1c1715 100%)',
  'linear-gradient(180deg, rgba(9, 9, 9, 0.08), rgba(9, 9, 9, 0.72)), linear-gradient(135deg, #6f7b87 0%, #38414d 50%, #191d22 100%)',
  'linear-gradient(180deg, rgba(11, 11, 11, 0.08), rgba(11, 11, 11, 0.72)), linear-gradient(135deg, #7f7a52 0%, #475236 50%, #1a1e17 100%)',
  'linear-gradient(180deg, rgba(8, 8, 8, 0.08), rgba(8, 8, 8, 0.72)), linear-gradient(135deg, #706560 0%, #403733 52%, #1b1817 100%)',
  'linear-gradient(180deg, rgba(12, 12, 12, 0.08), rgba(12, 12, 12, 0.75)), linear-gradient(135deg, #79736d 0%, #4f4a45 47%, #1d1a18 100%)',
  'linear-gradient(180deg, rgba(6, 6, 6, 0.08), rgba(6, 6, 6, 0.68)), linear-gradient(135deg, #90a7ae 0%, #4d6772 49%, #172127 100%)',
  'linear-gradient(180deg, rgba(10, 10, 10, 0.08), rgba(10, 10, 10, 0.72)), linear-gradient(135deg, #927255 0%, #584431 50%, #1f1814 100%)',
  'linear-gradient(180deg, rgba(7, 7, 7, 0.08), rgba(7, 7, 7, 0.74)), linear-gradient(135deg, #8d7568 0%, #53443d 45%, #1a1615 100%)',
]

export function buildHomeCategoryCards(
  categories: Array<{
    id: string
    name: string
    slug: string
    imageUrl?: string | null
  }>,
): HomeCategoryCard[] {
  return categories.map((category, index) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    imageUrl: category.imageUrl ?? null,
    imageStyle: categoryBackgrounds[index % categoryBackgrounds.length],
  }))
}
