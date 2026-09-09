import { useState, type ReactNode } from 'react'
import { useData } from '../../hooks/useData'
import type { PatientTelemetry } from '../../api/dashboard'
import PatientDetail from './components/PatientDetail'
import PatientsTable from './components/PatientsTable'
import SummaryCards from './components/SummaryCards'

export default function DashboardPage(): ReactNode {
  const { overview, loading, error } = useData()
  const [selected, setSelected] = useState<PatientTelemetry | null>(null)

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-sm text-red-700">
        Failed to load dashboard: {error}
      </div>
    )
  }

  if (loading || !overview) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-xl bg-white" />
        <div className="h-64 animate-pulse rounded-xl bg-white" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Collected patient health data, available for annual risk assessment.
          </p>
        </div>
      </div>

      <SummaryCards overview={overview} />

      {selected ? (
        <PatientDetail
          patient={selected}
          onClose={() => setSelected(null)}
        />
      ) : (
        <PatientsTable patients={overview.patients} onSelect={setSelected} />
      )}
    </div>
  )
}