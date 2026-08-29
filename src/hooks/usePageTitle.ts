import { usePageSeo } from '@/hooks/usePageSeo.ts'

export function usePageTitle(title: string) {
  usePageSeo({ title })
}
