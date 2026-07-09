import type { RequestProjectStatus } from '@/types/request-project.ts'

function getStatusStyles(status: RequestProjectStatus) {
  switch (status) {
    case 'draft':
      return 'border-sand-200 bg-sand-50 text-sand-700'
    case 'submitted':
      return 'border-sky-200 bg-sky-50 text-sky-800'
    case 'in_review':
      return 'border-yellow-200 bg-yellow-50 text-yellow-800'
    case 'contacted':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800'
    case 'closed':
      return 'border-slate-200 bg-slate-100 text-slate-700'
    default:
      return 'border-sand-200 bg-sand-50 text-sand-700'
  }
}

function getStatusLabel(status: RequestProjectStatus) {
  switch (status) {
    case 'draft':
      return 'Borrador'
    case 'submitted':
      return 'Enviada'
    case 'in_review':
      return 'En revision'
    case 'contacted':
      return 'Contactado'
    case 'closed':
      return 'Cerrado'
    default:
      return status
  }
}

type RequestProjectStatusBadgeProps = {
  status: RequestProjectStatus
}

export function RequestProjectStatusBadge({ status }: RequestProjectStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusStyles(status)}`}
    >
      {getStatusLabel(status)}
    </span>
  )
}
