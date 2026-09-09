import { useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { usePatient } from './hooks/usePatient'
import { usePrescriptions } from './hooks/usePrescriptions'
import { parseEgyptianNationalId } from './utils/nationalId'
import type { CreatePrescriptionDTO, PatientPrescription } from '../../api/patients'

const formatRelativeTime = (isoString: string | null): string => {
  if (!isoString) return 'Never dispensed'
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return 'Never dispensed'
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

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { patient, loading, error, refetch, setPatient } = usePatient(id)

  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [showAddModal, setShowAddModal] = useState(false)
  const [deactivateConfirmId, setDeactivateConfirmId] = useState<string | null>(null)

  // Add prescription form state
  const [medName, setMedName] = useState('')
  const [dosage, setDosage] = useState('')
  const [refillInterval, setRefillInterval] = useState(30)

  // Prescriptions hook with callbacks to update patient state
  const {
    addPrescription,
    deactivatePrescription,
    loading: rxSubmitting,
    actionLoadingId,
    error: rxError,
    fieldErrors: rxFieldErrors,
    resetErrors: resetRxErrors,
  } = usePrescriptions(
    (newRx: PatientPrescription) => {
      setPatient((prev) =>
        prev
          ? {
              ...prev,
              active_prescriptions: [newRx, ...(prev.active_prescriptions || [])],
            }
          : prev
      )
    },
    (updatedRx: PatientPrescription) => {
      setPatient((prev) =>
        prev
          ? {
              ...prev,
              active_prescriptions: (prev.active_prescriptions || []).map((rx) =>
                rx.id === updatedRx.id ? updatedRx : rx
              ),
            }
          : prev
      )
    }
  )

  // Parsed national ID info
  const parsedId = useMemo(() => {
    return patient ? parseEgyptianNationalId(patient.national_id) : null
  }, [patient])

  // Prescriptions list
  const prescriptions = useMemo(
    () => patient?.active_prescriptions || [],
    [patient?.active_prescriptions]
  )

  const filteredPrescriptions = useMemo(() => {
    if (filter === 'ACTIVE') return prescriptions.filter((rx) => rx.is_active)
    if (filter === 'INACTIVE') return prescriptions.filter((rx) => !rx.is_active)
    return prescriptions
  }, [prescriptions, filter])

  const handleAddSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!patient) return

    const dto: CreatePrescriptionDTO = {
      medication_name: medName.trim(),
      dosage: dosage.trim(),
      refill_interval_days: refillInterval,
    }

    try {
      await addPrescription(patient.id, dto, prescriptions)
      setMedName('')
      setDosage('')
      setRefillInterval(30)
      setShowAddModal(false)
    } catch {
      // Handled in hook
    }
  }

  const handleDeactivate = async (prescriptionId: string) => {
    try {
      await deactivatePrescription(prescriptionId)
      setDeactivateConfirmId(null)
    } catch {
      // Handled in hook
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-44 animate-pulse rounded-2xl bg-white border border-slate-200" />
        <div className="h-96 animate-pulse rounded-2xl bg-white border border-slate-200" />
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="max-w-md mx-auto mt-12 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-red-900">Patient Not Found</h2>
        <p className="mt-1 text-sm text-red-700">{error || 'Unable to find patient record.'}</p>
        <div className="mt-4 flex justify-center gap-3">
          <button
            onClick={refetch}
            className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            Retry
          </button>
          <Link
            to="/patients"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to Patients
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link to="/patients" className="hover:text-blue-600">
            Patients
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800">{patient.full_name}</span>
        </div>

        <Link
          to="/patients"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Directory
        </Link>
      </div>

      {/* Header / Summary Card */}
      <div
        data-testid="patient-summary-card"
        className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xl shadow-md">
              {patient.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900">{patient.full_name}</h1>
                {parsedId?.gender && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    {parsedId.gender}
                  </span>
                )}
                {parsedId?.age !== undefined && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    {parsedId.age} yrs old
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <div className="flex items-center gap-1 font-mono">
                  <span className="text-slate-400">ID:</span>
                  <span className="font-semibold text-slate-700">{patient.national_id}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Phone:</span>
                  <span className="font-semibold text-slate-700">{patient.phone_number}</span>
                </div>
                {parsedId?.governorate && (
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">Gov:</span>
                    <span className="font-semibold text-slate-700">{parsedId.governorate}</span>
                  </div>
                )}
                {parsedId?.birthDateFormatted && (
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">DOB:</span>
                    <span className="font-semibold text-slate-700">{parsedId.birthDateFormatted}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pinned Baseline Vitals */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
            {/* Blood Pressure Anchor */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 min-w-[140px]">
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Baseline BP
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-900">
                  {patient.baseline_systolic}/{patient.baseline_diastolic}
                </span>
                <span className="text-xs text-slate-500">mmHg</span>
              </div>
              <span
                className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  patient.baseline_systolic >= 140 || patient.baseline_diastolic >= 90
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {patient.baseline_systolic >= 140 || patient.baseline_diastolic >= 90
                  ? 'Hypertensive Baseline'
                  : 'Controlled Baseline'}
              </span>
            </div>

            {/* Fasting Glucose Anchor */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 min-w-[140px]">
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Baseline Glucose
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-900">
                  {patient.baseline_glucose ? patient.baseline_glucose : '—'}
                </span>
                {patient.baseline_glucose && (
                  <span className="text-xs text-slate-500">mg/dL</span>
                )}
              </div>
              <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                {patient.baseline_glucose ? 'Fasting Target' : 'Not Recorded'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Prescription Management Section */}
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
                Active ({prescriptions.filter((p) => p.is_active).length})
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
                Inactive ({prescriptions.filter((p) => !p.is_active).length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                resetRxErrors()
                setShowAddModal(true)
              }}
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
              <div
                key={rx.id}
                data-testid={`prescription-card-${rx.id}`}
                className={`rounded-xl border p-4 transition ${
                  rx.is_active
                    ? 'border-slate-200 bg-white shadow-sm hover:border-slate-300'
                    : 'border-slate-100 bg-slate-50/60 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{rx.medication_name}</h3>
                      {rx.is_active ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-600 font-medium">{rx.dosage}</p>
                  </div>

                  {rx.is_active && (
                    <button
                      type="button"
                      onClick={() => setDeactivateConfirmId(rx.id)}
                      disabled={actionLoadingId === rx.id}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 hover:border-red-200 transition disabled:opacity-50"
                    >
                      {actionLoadingId === rx.id ? 'Updating…' : 'Deactivate'}
                    </button>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Every {rx.refill_interval_days} days
                  </span>

                  <span className="text-slate-500" title={rx.last_dispensed_at || 'Never'}>
                    {formatRelativeTime(rx.last_dispensed_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Prescription Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add New Prescription</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {rxError && (
              <div
                role="alert"
                className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800"
              >
                {rxError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Medication Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Metformin 500mg"
                  value={medName}
                  onChange={(e) => {
                    resetRxErrors()
                    setMedName(e.target.value)
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                    rxFieldErrors.medication_name
                      ? 'border-red-400 bg-red-50/30 text-red-900 focus:border-red-500'
                      : 'border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  }`}
                />
                {rxFieldErrors.medication_name && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    {rxFieldErrors.medication_name}
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
                  value={refillInterval}
                  onChange={(e) => setRefillInterval(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Default: 30 days between authorized refills
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={rxSubmitting}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rxSubmitting || !medName.trim() || !dosage.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700 disabled:bg-slate-300"
                >
                  {rxSubmitting ? 'Saving…' : 'Save Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Trigger Modal */}
      {deactivateConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Deactivate Prescription</h3>
            <p className="mt-2 text-xs text-slate-600">
              Are you sure you want to deactivate this prescription? The patient will no longer be eligible for automated monthly refill authorizations under this regimen.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeactivateConfirmId(null)}
                className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeactivate(deactivateConfirmId)}
                className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                Confirm Deactivation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
