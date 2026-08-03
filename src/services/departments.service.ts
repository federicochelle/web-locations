import { supabase } from '@/lib/supabase.ts'
import type { Department } from '@/types/location.ts'

type DepartmentRow = {
  id: string
  name: string | null
  slug: string | null
}

export async function getPublicDepartments(): Promise<Department[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('id, name, slug')
    .order('name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as DepartmentRow[])
    .filter(
      (department): department is DepartmentRow =>
        Boolean(department.id && department.name?.trim() && department.slug?.trim()),
    )
    .map((department) => ({
      id: department.id,
      name: department.name!.trim(),
      slug: department.slug!.trim(),
    }))
}
