import { useMemo, useState } from 'react'
import type { PatientPrescription, PrescriptionStatus } from '../types/patient.types'
import PrescriptionRow from './PrescriptionRow'

export interface PrescriptionListProps {
  prescriptions: PatientPrescription[]
  onDeactivateClick: (prescriptionId: string) => void
  onAddClick: () => void
  actionLoadingId: string | null
}

export default function PrescriptionList({
  prescriptions,
  onDeactivateClick,
  onAddClick,
  actionLoadingId,
}: PrescriptionListProps) {
  const [filter, setFilter] = useState<'ALL' | PrescriptionStatus>('ALL')

  const filteredPrescriptions = useMemo(() => {
    if (filter === 'ACTIVE') return prescriptions.filter((rx) => rx.is_active)
    if (filter === 'INACTIVE') return prescriptions.filter((rx) => !rx.is_active)
    return prescriptions
  }, [prescriptions, filter])

  const activeCount = useMemo(
    () => prescriptions.filter((rx) => rx.is_active).length,
    [prescriptions]
  )
  const inactiveCount = prescriptions.length - activeCount

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Prescription Registry</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Active chronic regimens, dosage schedules, and dispensing history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Pills */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`rounded-md px-3 py-1 transition ${
                filter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All ({prescriptions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('ACTIVE')}
              className={`rounded-md px-3 py-1 transition ${
                filter === 'ACTIVE'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('INACTIVE')}
              className={`rounded-md px-3 py-1 transition ${
                filter === 'INACTIVE'
                  ? 'bg-white text-slate-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Inactive ({inactiveCount})
            </button>
          </div>

          <button
            type="button"
            onClick={onAddClick}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Prescription
          </button>
        </div>
      </div>

      {/* Prescription List */}
      {filteredPrescriptions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <svg
            className="mx-auto h-10 w-10 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <p className="mt-2 text-sm font-medium text-slate-700">No prescriptions found</p>
          <p className="text-xs text-slate-400">
            {filter === 'ACTIVE'
              ? 'No active regimens currently recorded for this patient.'
              : 'Click "Add Prescription" to register a new medication.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPrescriptions.map((rx) => (
            <PrescriptionRow
              key={rx.id}
              prescription={rx}
              onDeactivateClick={onDeactivateClick}
              isDeactivating={actionLoadingId === rx.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
