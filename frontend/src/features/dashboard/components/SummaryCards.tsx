import type { ReactNode } from 'react'
import type { DashboardOverview } from '../../../api/dashboard'

function Card({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: string
}): ReactNode {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  )
}

export default function SummaryCards({
  overview,
}: {
  overview: DashboardOverview
}): ReactNode {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card
        label="Enrolled Patients"
        value={overview.total_patients}
        accent="text-slate-900"
      />
      <Card
        label="Active Prescriptions"
        value={overview.active_prescriptions}
        accent="text-blue-600"
      />
      <Card
        label="Refill Cycles Collected"
        value={overview.total_cycles}
        accent="text-emerald-600"
      />
      <Card
        label="Flagged Cycles (review)"
        value={overview.flagged_cycles}
        accent="text-amber-600"
      />
    </div>
  )
}