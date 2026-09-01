import type { RequestProject } from '@/types/request-project.ts'
import type { SelectionPdfFormValues } from '@/types/selection-pdf.ts'

export type NormalizedRequestProjectFormValues = {
  title: string
  productLogoUrl: string | null
  productionCompany: string
  productionCompanyId: string | null
  productionCompanyLogoUrl: string | null
  tentativeStartDate: string | null
  tentativeEndDate: string | null
  message: string
}

export function normalizeRequestProjectFormValues(
  values: SelectionPdfFormValues,
): NormalizedRequestProjectFormValues {
  return {
    title: values.product.trim(),
    productLogoUrl: values.productLogoUrl?.trim() || null,
    productionCompany: values.productionCompany.trim(),
    productionCompanyId: values.productionCompanyId,
    productionCompanyLogoUrl: values.productionCompanyLogoUrl?.trim() || null,
    tentativeStartDate: values.tentativeStartDate || null,
    tentativeEndDate: values.tentativeEndDate || null,
    message: values.message.trim(),
  }
}

export function normalizeRequestProjectSnapshotFromProject(
  project: RequestProject,
): NormalizedRequestProjectFormValues {
  return {
    title: project.title,
    productLogoUrl: project.productLogoUrl,
    productionCompany: project.productionCompany ?? '',
    productionCompanyId: project.productionCompanyId,
    productionCompanyLogoUrl: project.productionCompanyLogoUrl,
    tentativeStartDate: project.tentativeStartDate ?? null,
    tentativeEndDate: project.tentativeEndDate ?? null,
    message: project.message ?? '',
  }
}

export function createRequestProjectFormSnapshot(
  values: NormalizedRequestProjectFormValues,
) {
  return JSON.stringify(values)
}
