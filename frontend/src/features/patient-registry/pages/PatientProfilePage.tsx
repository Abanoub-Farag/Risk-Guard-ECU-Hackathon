import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AddPrescriptionModal from '../components/AddPrescriptionModal'
import PatientSummaryCard from '../components/PatientSummaryCard'
import PrescriptionList from '../components/PrescriptionList'
import { usePatient } from '../hooks/usePatient'
import type { CreatePrescriptionDTO } from '../types/patient.types'

export default function PatientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const {
    patient,
    prescriptions,
    loading,
    rxSubmitting,
    actionLoadingId,
    error,
    rxError,
    rxFieldErrors,
    refetch,
    addPrescription,
    deactivatePrescription,
  } = usePatient(id)

  const [showAddModal, setShowAddModal] = useState(false)
  const [deactivateConfirmId, setDeactivateConfirmId] = useState<string | null>(null)

  const handleAddSubmit = async (dto: CreatePrescriptionDTO) => {
    try {
      await addPrescription(dto)
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
      {/* Breadcrumb / Navigation */}
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

      {/* Summary Card */}
      <PatientSummaryCard patient={patient} />

      {/* Prescriptions List */}
      <PrescriptionList
        prescriptions={prescriptions}
        onDeactivateClick={(prescriptionId) => setDeactivateConfirmId(prescriptionId)}
        onAddClick={() => setShowAddModal(true)}
        actionLoadingId={actionLoadingId}
      />

      {/* Add Modal */}
      <AddPrescriptionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddSubmit}
        isSubmitting={rxSubmitting}
        error={rxError}
        fieldErrors={rxFieldErrors}
      />

      {/* Deactivate Confirmation Prompt */}
      {deactivateConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
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
