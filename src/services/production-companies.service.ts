import { supabase } from '@/lib/supabase.ts'
import type { ProductionCompany } from '@/types/production-company.ts'

type ProductionCompanyRow = {
  id: string
  name?: string | null
  logo_url?: string | null
  logo_public_id?: string | null
  active?: boolean | null
}

function mapProductionCompany(row: ProductionCompanyRow): ProductionCompany {
  return {
    id: row.id,
    name: row.name?.trim() || 'Sin nombre',
    logoUrl: row.logo_url?.trim() || null,
    logoPublicId: row.logo_public_id?.trim() || null,
    active: row.active ?? false,
  }
}

export async function getActiveProductionCompanies() {
  const { data, error } = await supabase
    .from('production_companies')
    .select('id, name, logo_url, logo_public_id, active')
    .eq('active', true)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as ProductionCompanyRow[]).map((row) =>
    mapProductionCompany(row),
  )
}

export async function getProductionCompanyById(id: string) {
  const normalizedId = id.trim()

  if (!normalizedId) {
    return null
  }

  const { data, error } = await supabase
    .from('production_companies')
    .select('id, name, logo_url, logo_public_id, active')
    .eq('id', normalizedId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    return null
  }

  return mapProductionCompany(data as ProductionCompanyRow)
}
