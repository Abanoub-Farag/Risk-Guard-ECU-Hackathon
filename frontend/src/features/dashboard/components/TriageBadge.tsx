import type { ReactNode } from 'react'
import type { TriageColor } from '../../../api/dashboard'

const styles: Record<TriageColor, { label: string; classes: string }> = {
  GREEN: { label: 'Stable', classes: 'bg-emerald-100 text-emerald-800' },
  YELLOW: { label: 'Review', classes: 'bg-amber-100 text-amber-800' },
  RED: { label: 'Flagged', classes: 'bg-red-100 text-red-800' },
}

export default function TriageBadge({
  color,
}: {
  color: TriageColor | null
}): ReactNode {
  if (!color) {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
        Pending
      </span>
    )
  }
  const { label, classes } = styles[color]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}