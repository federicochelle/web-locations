import type { RequestProjectStatus } from '@/types/request-project.ts'

function getStatusStyles(status: RequestProjectStatus) {
  switch (status) {
    case 'draft':
      return 'border-white/18 bg-white/14 text-white shadow-[0_10px_24px_rgba(0,0,0,0.16)]'
    case 'pending':
      return 'border-sky-300/35 bg-sky-400/16 text-sky-50 shadow-[0_10px_24px_rgba(14,116,144,0.18)]'
    case 'confirmed':
      return 'border-emerald-300/55 bg-emerald-400/22 text-emerald-50 shadow-[0_10px_24px_rgba(16,185,129,0.2)]'
    case 'submitted':
      return 'border-amber-300/35 bg-amber-400/16 text-amber-50 shadow-[0_10px_24px_rgba(217,119,6,0.18)]'
    case 'in_review':
      return 'border-violet-300/35 bg-violet-400/16 text-violet-50 shadow-[0_10px_24px_rgba(139,92,246,0.18)]'
    case 'contacted':
      return 'border-cyan-300/35 bg-cyan-400/16 text-cyan-50 shadow-[0_10px_24px_rgba(6,182,212,0.18)]'
    case 'closed':
      return 'border-white/14 bg-white/10 text-white/88 shadow-[0_10px_24px_rgba(0,0,0,0.14)]'
    default:
      return 'border-white/18 bg-white/14 text-white shadow-[0_10px_24px_rgba(0,0,0,0.16)]'
  }
}

function getStatusLabel(status: RequestProjectStatus) {
  switch (status) {
    case 'draft':
      return 'Borrador'
    case 'pending':
      return 'Enviado'
    case 'confirmed':
      return 'Confirmado'
    case 'submitted':
      return 'Enviado'
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
      className={`inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-[0.72rem] font-medium backdrop-blur-sm ${getStatusStyles(status)}`}
    >
      {getStatusLabel(status)}
    </span>
  )
}
