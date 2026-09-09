import type { ReactNode } from 'react'
import type { RefillStatus } from '../types/refill.types'

interface RefillStatusBadgeProps {
  status: RefillStatus
  className?: string
}

const statusConfig: Record<
  RefillStatus,
  { label: string; bg: string; text: string; ring: string; dot: string }
> = {
  SUBMITTED: {
    label: 'Submitted',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    ring: 'ring-blue-600/20',
    dot: 'bg-blue-500',
  },
  PROCESSED: {
    label: 'Processed',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    ring: 'ring-indigo-600/20',
    dot: 'bg-indigo-500',
  },
  APPROVED: {
    label: 'Approved',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-600/20',
    dot: 'bg-emerald-500',
  },
  NEEDS_REVIEW: {
    label: 'Needs Clinician Review',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    ring: 'ring-amber-600/20',
    dot: 'bg-amber-500',
  },
  REJECTED: {
    label: 'Rejected',
    bg: 'bg-red-50',
    text: 'text-red-700',
    ring: 'ring-red-600/20',
    dot: 'bg-red-500',
  },
}

export function RefillStatusBadge({
  status,
  className = '',
}: RefillStatusBadgeProps): ReactNode {
  const cfg = statusConfig[status] ?? {
    label: status,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    ring: 'ring-slate-500/10',
    dot: 'bg-slate-400',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${cfg.bg} ${cfg.text} ${cfg.ring} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  )
}
