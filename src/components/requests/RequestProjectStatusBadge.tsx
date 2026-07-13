import type { RequestProjectStatus } from '@/types/request-project.ts'

function getStatusStyles(status: RequestProjectStatus) {
  switch (status) {
    case 'draft':
      return 'border-white/8 bg-white/6 text-brand-100/78'
    case 'submitted':
      return 'border-white/8 bg-white/6 text-brand-100/78'
    case 'in_review':
      return 'border-white/8 bg-white/6 text-brand-100/78'
    case 'contacted':
      return 'border-white/8 bg-white/6 text-brand-100/78'
    case 'closed':
      return 'border-white/8 bg-white/6 text-brand-100/78'
    default:
      return 'border-white/8 bg-white/6 text-brand-100/78'
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
      className={`inline-flex rounded-full border px-2.5 py-1 text-[0.72rem] font-medium ${getStatusStyles(status)}`}
    >
      {getStatusLabel(status)}
    </span>
  )
}
