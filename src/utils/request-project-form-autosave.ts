import type { RequestProject } from '@/types/request-project.ts'
import type { SelectionPdfFormValues } from '@/types/selection-pdf.ts'

export type NormalizedRequestProjectFormValues = {
  title: string
  productionCompany: string
  tentativeStartDate: string | null
  tentativeEndDate: string | null
  message: string
}

export function normalizeRequestProjectFormValues(
  values: SelectionPdfFormValues,
): NormalizedRequestProjectFormValues {
  return {
    title: values.product.trim(),
    productionCompany: values.productionCompany.trim(),
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
    productionCompany: project.productionCompany ?? '',
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
