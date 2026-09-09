import type { PatientPrescription } from '../types/patient.types'

export interface PrescriptionRowProps {
  prescription: PatientPrescription
  onDeactivateClick: (prescriptionId: string) => void
  isDeactivating?: boolean
}

const formatRelativeTime = (isoString: string | null): string => {
  if (!isoString) return 'Never dispensed'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return 'Never dispensed'
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours <= 0) return 'Dispensed just now'
    return `Dispensed ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  }
  if (diffDays === 1) return 'Dispensed yesterday'
  return `Dispensed ${diffDays} days ago`
}

export default function PrescriptionRow({
  prescription,
  onDeactivateClick,
  isDeactivating = false,
}: PrescriptionRowProps) {
  return (
    <div
      data-testid={`prescription-row-${prescription.id}`}
      className={`rounded-xl border p-4 transition ${
        prescription.is_active
          ? 'border-slate-200 bg-white shadow-sm hover:border-slate-300'
          : 'border-slate-100 bg-slate-50/60 opacity-80'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm">
              {prescription.medication_name}
            </h3>
            {prescription.is_active ? (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                Active
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                Inactive
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-600 font-medium">{prescription.dosage}</p>
        </div>

        {prescription.is_active && (
          <button
            type="button"
            onClick={() => onDeactivateClick(prescription.id)}
            disabled={isDeactivating}
            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 hover:border-red-200 transition disabled:opacity-50"
          >
            {isDeactivating ? 'Deactivating…' : 'Deactivate'}
          </button>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1 font-medium">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Every {prescription.refill_interval_days} days
        </span>

        <span className="text-slate-500" title={prescription.last_dispensed_at || 'Never'}>
          {formatRelativeTime(prescription.last_dispensed_at)}
        </span>
      </div>
    </div>
  )
}
