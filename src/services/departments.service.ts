import { supabase } from '@/lib/supabase.ts'
import type { Department } from '@/types/location.ts'

type DepartmentRow = {
  id: string
  name: string | null
  slug: string | null
}

let cachedPublicDepartments: Department[] | null = null
let publicDepartmentsInFlight: Promise<Department[]> | null = null

function mapDepartmentRows(rows: DepartmentRow[]) {
  return rows
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

export async function getPublicDepartments(): Promise<Department[]> {
  if (cachedPublicDepartments) {
    return cachedPublicDepartments
  }

  if (publicDepartmentsInFlight) {
    return publicDepartmentsInFlight
  }

  publicDepartmentsInFlight = (async () => {
    const { data, error } = await supabase.rpc('get_public_departments_with_locations')

    if (error) {
      throw new Error(error.message)
    }

    const departments = mapDepartmentRows((data ?? []) as DepartmentRow[])
    cachedPublicDepartments = departments
    return departments
  })()

  try {
    return await publicDepartmentsInFlight
  } finally {
    publicDepartmentsInFlight = null
  }
}

export async function getPublicDepartmentsByCategory(
  categorySlug: string,
): Promise<Department[]> {
  const normalizedCategorySlug = categorySlug.trim()

  if (!normalizedCategorySlug) {
    return []
  }

  const { data, error } = await supabase.rpc('get_public_departments_by_category', {
    p_category_slug: normalizedCategorySlug,
  })

  if (error) {
    throw new Error(error.message)
  }

  return mapDepartmentRows((data ?? []) as DepartmentRow[])
}

export async function getPublicDepartmentNameBySlug(
  departmentSlug: string,
): Promise<string | null> {
  const normalizedDepartmentSlug = departmentSlug.trim()

  if (!normalizedDepartmentSlug) {
    return null
  }

  const departments = await getPublicDepartments()
  const matchedDepartment = departments.find(
    (department) => department.slug === normalizedDepartmentSlug,
  )

  return matchedDepartment?.name ?? null
}
