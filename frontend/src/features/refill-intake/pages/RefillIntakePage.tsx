import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useData } from '../../../hooks/useData'
import { DeviceImageDropzone } from '../components/DeviceImageDropzone'
import { DeviceTypeSelector } from '../components/DeviceTypeSelector'
import { EarlyRefillWarningBanner } from '../components/EarlyRefillWarningBanner'
import { ImagePreviewCard } from '../components/ImagePreviewCard'
import { SymptomQuestionnaire } from '../components/SymptomQuestionnaire'
import { useDeviceScanUpload } from '../hooks/useDeviceScanUpload'
import { useRefillIntake } from '../hooks/useRefillIntake'
import '../styles/refill-intake.css'

export function RefillIntakePage(): ReactNode {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { overview, loading } = useData()

  const initialPatientId = searchParams.get('patient_id') ?? ''
  const initialPrescriptionId = searchParams.get('prescription_id') ?? ''

  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId)
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string>(initialPrescriptionId)

  const patients = useMemo(
    () => overview?.patients ?? [],
    [overview?.patients]
  )

  const currentPatient = useMemo(
    () => patients.find((p) => p.patient_id === selectedPatientId) ?? null,
    [patients, selectedPatientId]
  )

  const activePrescriptions = useMemo(
    () => currentPatient?.active_prescriptions ?? [],
    [currentPatient]
  )

  const selectedPrescription = useMemo(
    () => activePrescriptions.find((rx) => rx.id === selectedPrescriptionId) ?? null,
    [activePrescriptions, selectedPrescriptionId]
  )

  const {
    deviceType,
    stagedFile,
    previewUrl,
    isDragging,
    isValidating,
    validationError,
    setDeviceType,
    clearFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInputChange,
  } = useDeviceScanUpload('BLOOD_PRESSURE')

  const {
    missedDoses,
    hasSevereSymptoms,
    submissionStage,
    isSubmitting,
    apiError,
    fieldErrors,
    timelineValidation,
    setMissedDoses,
    setHasSevereSymptoms,
    submitRefillIntake,
  } = useRefillIntake({
    selectedPrescriptionLastDispensedAt: selectedPrescription?.last_dispensed_at,
  })

  const handlePatientSelect = (id: string) => {
    setSelectedPatientId(id)
    setSelectedPrescriptionId('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!stagedFile) return
    if (timelineValidation.isBlocked) return

    const result = await submitRefillIntake({
      patientId: selectedPatientId,
      prescriptionId: selectedPrescriptionId,
      file: stagedFile,
      deviceType,
    })
    if (result && result.id) {
      navigate(`/refills/${result.id}`)
    }
  }

  const isSubmitDisabled =
    !selectedPatientId ||
    !selectedPrescriptionId ||
    !stagedFile ||
    timelineValidation.isBlocked ||
    isSubmitting ||
    isValidating

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-white shadow-sm" />
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Monthly Refill Intake & Device Scan Ingestion
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Initiate a monthly prescription refill request and ingest biometric LCD screen captures for automated triage.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Patient & Prescription Context */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-semibold text-slate-900">
              1. Patient & Prescription Identification
            </h2>
            <p className="text-xs text-slate-500">
              Select the registered chronic patient and their active medication regimen.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="patient-select"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
              >
                Patient Selection *
              </label>
              <select
                id="patient-select"
                value={selectedPatientId}
                onChange={(e) => handlePatientSelect(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select patient…</option>
                {patients.map((p) => (
                  <option key={p.patient_id} value={p.patient_id}>
                    {p.full_name} ({p.national_id})
                  </option>
                ))}
              </select>
              {fieldErrors.patient_id && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.patient_id}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="prescription-select"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
              >
                Active Prescription *
              </label>
              <select
                id="prescription-select"
                value={selectedPrescriptionId}
                onChange={(e) => setSelectedPrescriptionId(e.target.value)}
                disabled={!selectedPatientId || activePrescriptions.length === 0}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">
                  {!selectedPatientId
                    ? 'Select a patient first'
                    : activePrescriptions.length === 0
                      ? 'No active prescriptions registered'
                      : 'Select prescription…'}
                </option>
                {activePrescriptions.map((rx) => (
                  <option key={rx.id} value={rx.id}>
                    {rx.medication_name} — {rx.dosage} (Last dispensed:{' '}
                    {rx.last_dispensed_at
                      ? new Date(rx.last_dispensed_at).toLocaleDateString()
                      : 'Never'}
                    )
                  </option>
                ))}
              </select>
              {fieldErrors.prescription_id && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.prescription_id}</p>
              )}
            </div>
          </div>

          {/* Selected Prescription Metadata */}
          {selectedPrescription && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Prescription:</span>
                <span className="font-medium text-slate-900">
                  {selectedPrescription.medication_name} ({selectedPrescription.dosage})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Last Dispensed Date:</span>
                <span className="font-medium text-slate-900">
                  {selectedPrescription.last_dispensed_at
                    ? new Date(selectedPrescription.last_dispensed_at).toLocaleString()
                    : 'Initial Dispensing Cycle (No prior history)'}
                </span>
              </div>
            </div>
          )}

          {/* 25-Day Early Refill Guardrail Warning Banner */}
          <EarlyRefillWarningBanner validation={timelineValidation} />
        </div>

        {/* Step 2: Clinical Adherence Questionnaire */}
        <SymptomQuestionnaire
          missedDoses={missedDoses}
          hasSevereSymptoms={hasSevereSymptoms}
          onMissedDosesChange={setMissedDoses}
          onHasSevereSymptomsChange={setHasSevereSymptoms}
          disabled={timelineValidation.isBlocked || isSubmitting}
          error={fieldErrors.missed_doses_past_week}
        />

        {/* Step 3: Medical Device Scan Ingestion */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-semibold text-slate-900">
              2. Medical Device Screen Capture Ingestion
            </h2>
            <p className="text-xs text-slate-500">
              Biometric screen capture is mandatory prior to submitting monthly refills for automated triage.
            </p>
          </div>

          <DeviceTypeSelector
            selectedType={deviceType}
            onChange={setDeviceType}
            disabled={timelineValidation.isBlocked || isSubmitting}
          />

          {!stagedFile || !previewUrl ? (
            <DeviceImageDropzone
              isDragging={isDragging}
              isValidating={isValidating}
              error={validationError}
              disabled={timelineValidation.isBlocked || isSubmitting}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onFileInputChange={handleFileInputChange}
            />
          ) : (
            <ImagePreviewCard
              file={stagedFile}
              previewUrl={previewUrl}
              deviceType={deviceType}
              onRemove={clearFile}
              disabled={isSubmitting}
            />
          )}
        </div>

        {/* Global Error Banner */}
        {apiError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800"
          >
            <svg
              className="h-5 w-5 shrink-0 text-red-600 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <span className="font-semibold">Submission Failed</span>
              <p className="mt-0.5">{apiError}</p>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <span>
                  {submissionStage === 'creating_request' && 'Creating Refill Request…'}
                  {submissionStage === 'uploading_scan' && 'Ingesting Device Scan…'}
                  {submissionStage === 'submitting_for_review' && 'Locking Review Pipeline…'}
                </span>
              </>
            ) : (
              'Submit Refill for Triage Review'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
