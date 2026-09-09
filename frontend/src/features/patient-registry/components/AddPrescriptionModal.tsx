import { useState, type FormEvent } from 'react'
import type { CreatePrescriptionDTO } from '../types/patient.types'

export interface AddPrescriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (dto: CreatePrescriptionDTO) => Promise<void>
  isSubmitting: boolean
  error: string | null
  fieldErrors: Record<string, string>
}

export default function AddPrescriptionModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  fieldErrors,
}: AddPrescriptionModalProps) {
  const [medicationName, setMedicationName] = useState('')
  const [dosage, setDosage] = useState('')
  const [refillIntervalDays, setRefillIntervalDays] = useState(30)

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!medicationName.trim() || !dosage.trim()) return

    await onSubmit({
      medication_name: medicationName.trim(),
      dosage: dosage.trim(),
      refill_interval_days: refillIntervalDays,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Add New Prescription</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Medication Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isSubmitting}
              placeholder="e.g., Metformin 500mg"
              value={medicationName}
              onChange={(e) => setMedicationName(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${
                fieldErrors.medication_name
                  ? 'border-red-400 bg-red-50/30 text-red-900 focus:border-red-500'
                  : 'border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              }`}
            />
            {fieldErrors.medication_name && (
              <p className="mt-1 text-xs text-red-600 font-medium">
                {fieldErrors.medication_name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Dosage Instructions <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isSubmitting}
              placeholder="e.g., 1 tablet twice daily with meals"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Refill Interval (Days)
            </label>
            <input
              type="number"
              min={1}
              max={365}
              disabled={isSubmitting}
              value={refillIntervalDays}
              onChange={(e) => setRefillIntervalDays(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Default: 30 days between authorized refills
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !medicationName.trim() || !dosage.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700 transition disabled:bg-slate-300"
            >
              {isSubmitting ? 'Saving…' : 'Save Prescription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
