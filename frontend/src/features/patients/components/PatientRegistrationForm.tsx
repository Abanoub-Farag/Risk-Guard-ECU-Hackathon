import { useState, type FormEvent } from 'react'
import type { CreatePatientDTO, Patient } from '../../../api/patients'
import { useCreatePatient } from '../hooks/useCreatePatient'
import { cleanNationalId, parseEgyptianNationalId } from '../utils/nationalId'
import { validateBiometrics } from '../utils/biometrics'

interface PatientRegistrationFormProps {
  onSuccess?: (patient: Patient) => void
  onCancel?: () => void
  isModal?: boolean
}

export default function PatientRegistrationForm({
  onSuccess,
  onCancel,
  isModal = false,
}: PatientRegistrationFormProps) {
  const { createPatient, loading, error: apiError, fieldErrors, resetErrors } =
    useCreatePatient()

  const [nationalId, setNationalId] = useState('')
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [systolic, setSystolic] = useState<string>('')
  const [diastolic, setDiastolic] = useState<string>('')
  const [glucose, setGlucose] = useState<string>('')

  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  // Parse National ID in real-time
  const parsedId = nationalId.length > 0 ? parseEgyptianNationalId(nationalId) : null
  const nationalIdError =
    touched.nationalId && nationalId.length > 0 && !parsedId?.isValid
      ? parsedId?.error
      : touched.nationalId && nationalId.length === 0
      ? 'National ID is required'
      : undefined

  // Parse and validate biometrics
  const numSystolic = systolic === '' ? null : Number(systolic)
  const numDiastolic = diastolic === '' ? null : Number(diastolic)
  const numGlucose = glucose === '' ? null : Number(glucose)

  const biometricResult = validateBiometrics(numSystolic, numDiastolic, numGlucose)

  // Full form validity check
  const isFormValid = Boolean(
    nationalId.length === 14 &&
      parsedId?.isValid &&
      fullName.trim().length >= 3 &&
      phoneNumber.trim().length >= 8 &&
      numSystolic !== null &&
      numDiastolic !== null &&
      biometricResult.isValid
  )

  const handleNationalIdChange = (val: string) => {
    resetErrors()
    const cleaned = cleanNationalId(val)
    setNationalId(cleaned)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched({
      nationalId: true,
      fullName: true,
      phoneNumber: true,
      systolic: true,
      diastolic: true,
      glucose: true,
    })

    if (!isFormValid || numSystolic === null || numDiastolic === null) return

    const payload: CreatePatientDTO = {
      national_id: nationalId,
      full_name: fullName.trim(),
      phone_number: phoneNumber.trim(),
      baseline_systolic: numSystolic,
      baseline_diastolic: numDiastolic,
      baseline_glucose: numGlucose !== null && !Number.isNaN(numGlucose) ? numGlucose : null,
    }

    try {
      const created = await createPatient(payload)
      onSuccess?.(created)
    } catch {
      // Handled inside hook
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={`rounded-xl bg-white ${isModal ? 'p-0' : 'p-6 sm:p-8 shadow-sm border border-slate-200'} space-y-6`}
      data-testid="patient-registration-form"
    >
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Register Chronic Patient
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Enter verified identity anchors, contact information, and baseline clinical vitals.
        </p>
      </div>

      {apiError && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800 flex items-start gap-3"
        >
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <span className="font-semibold block">Registration Error</span>
            <span>{apiError}</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* National ID with live parsing */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="national_id" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Egyptian National ID <span className="text-red-500">*</span>
            </label>
            <span className="text-xs font-mono text-slate-400">
              {nationalId.length}/14 digits
            </span>
          </div>
          <input
            id="national_id"
            name="national_id"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="28505140101235"
            value={nationalId}
            onChange={(e) => handleNationalIdChange(e.target.value)}
            onBlur={() => markTouched('nationalId')}
            maxLength={14}
            aria-invalid={Boolean(nationalIdError || fieldErrors.national_id)}
            aria-describedby="national_id_feedback"
            className={`w-full rounded-lg border px-3.5 py-2.5 font-mono text-sm tracking-widest outline-none transition duration-150 ${
              nationalIdError || fieldErrors.national_id
                ? 'border-red-400 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                : parsedId?.isValid
                ? 'border-emerald-400 bg-emerald-50/20 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
                : 'border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
            }`}
          />

          <div id="national_id_feedback">
            {(nationalIdError || fieldErrors.national_id) && (
              <p className="mt-1.5 text-xs text-red-600 font-medium">
                {nationalIdError || fieldErrors.national_id}
              </p>
            )}
          </div>

          {/* Real-time National ID Extraction Indicator */}
          {parsedId?.isValid && (
            <div
              data-testid="national-id-parsed-badge"
              className="mt-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900 grid grid-cols-2 sm:grid-cols-4 gap-2"
            >
              <div>
                <span className="block text-emerald-600 font-medium">Birth Date:</span>
                <span className="font-semibold">{parsedId.birthDateFormatted}</span>
              </div>
              <div>
                <span className="block text-emerald-600 font-medium">Governorate:</span>
                <span className="font-semibold">{parsedId.governorate}</span>
              </div>
              <div>
                <span className="block text-emerald-600 font-medium">Gender:</span>
                <span className="font-semibold">{parsedId.gender}</span>
              </div>
              <div>
                <span className="block text-emerald-600 font-medium">Calculated Age:</span>
                <span className="font-semibold">{parsedId.age} yrs</span>
              </div>
            </div>
          )}
        </div>

        {/* Full Name */}
        <div>
          <label htmlFor="full_name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            placeholder="Mohamed Ahmed Mahmoud"
            value={fullName}
            onChange={(e) => {
              resetErrors()
              setFullName(e.target.value)
            }}
            onBlur={() => markTouched('fullName')}
            aria-invalid={Boolean(
              (touched.fullName && fullName.trim().length < 3) || fieldErrors.full_name
            )}
            className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition duration-150 ${
              (touched.fullName && fullName.trim().length < 3) || fieldErrors.full_name
                ? 'border-red-400 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                : 'border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
            }`}
          />
          {((touched.fullName && fullName.trim().length < 3) || fieldErrors.full_name) && (
            <p className="mt-1.5 text-xs text-red-600 font-medium">
              {fieldErrors.full_name || 'Full name must contain at least 3 characters'}
            </p>
          )}
        </div>

        {/* Phone Number */}
        <div>
          <label htmlFor="phone_number" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            id="phone_number"
            name="phone_number"
            type="tel"
            placeholder="01012345678"
            value={phoneNumber}
            onChange={(e) => {
              resetErrors()
              setPhoneNumber(e.target.value)
            }}
            onBlur={() => markTouched('phoneNumber')}
            aria-invalid={Boolean(
              (touched.phoneNumber && phoneNumber.trim().length < 8) || fieldErrors.phone_number
            )}
            className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition duration-150 ${
              (touched.phoneNumber && phoneNumber.trim().length < 8) || fieldErrors.phone_number
                ? 'border-red-400 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                : 'border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
            }`}
          />
          <p className="mt-1 text-xs text-slate-400">
            Local Egyptian format (e.g. 01012345678 or +201012345678)
          </p>
          {((touched.phoneNumber && phoneNumber.trim().length < 8) || fieldErrors.phone_number) && (
            <p className="mt-1 text-xs text-red-600 font-medium">
              {fieldErrors.phone_number || 'Valid contact phone number is required'}
            </p>
          )}
        </div>

        {/* Biometrics Section */}
        <div className="pt-2 border-t border-slate-100">
          <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            Baseline Biometric Anchors
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Systolic */}
            <div>
              <label htmlFor="baseline_systolic" className="block text-xs font-medium text-slate-600 mb-1">
                Systolic (mmHg) <span className="text-red-500">*</span>
              </label>
              <input
                id="baseline_systolic"
                name="baseline_systolic"
                type="number"
                min={50}
                max={300}
                placeholder="120"
                value={systolic}
                onChange={(e) => {
                  resetErrors()
                  setSystolic(e.target.value)
                }}
                onBlur={() => markTouched('systolic')}
                aria-invalid={Boolean(
                  (touched.systolic && biometricResult.errors.systolic) ||
                    fieldErrors.baseline_systolic
                )}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition duration-150 ${
                  (touched.systolic && biometricResult.errors.systolic) ||
                  fieldErrors.baseline_systolic
                    ? 'border-red-400 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                    : 'border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                }`}
              />
              <span className="text-[11px] text-slate-400 block mt-0.5">Range: 50–300</span>
              {touched.systolic && biometricResult.errors.systolic && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {biometricResult.errors.systolic}
                </p>
              )}
              {fieldErrors.baseline_systolic && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {fieldErrors.baseline_systolic}
                </p>
              )}
            </div>

            {/* Diastolic */}
            <div>
              <label htmlFor="baseline_diastolic" className="block text-xs font-medium text-slate-600 mb-1">
                Diastolic (mmHg) <span className="text-red-500">*</span>
              </label>
              <input
                id="baseline_diastolic"
                name="baseline_diastolic"
                type="number"
                min={30}
                max={200}
                placeholder="80"
                value={diastolic}
                onChange={(e) => {
                  resetErrors()
                  setDiastolic(e.target.value)
                }}
                onBlur={() => markTouched('diastolic')}
                aria-invalid={Boolean(
                  (touched.diastolic && biometricResult.errors.diastolic) ||
                    fieldErrors.baseline_diastolic
                )}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition duration-150 ${
                  (touched.diastolic && biometricResult.errors.diastolic) ||
                  fieldErrors.baseline_diastolic
                    ? 'border-red-400 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                    : 'border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                }`}
              />
              <span className="text-[11px] text-slate-400 block mt-0.5">Range: 30–200</span>
              {touched.diastolic && biometricResult.errors.diastolic && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {biometricResult.errors.diastolic}
                </p>
              )}
              {fieldErrors.baseline_diastolic && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {fieldErrors.baseline_diastolic}
                </p>
              )}
            </div>

            {/* Fasting Glucose */}
            <div>
              <label htmlFor="baseline_glucose" className="block text-xs font-medium text-slate-600 mb-1">
                Glucose (mg/dL) <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="baseline_glucose"
                name="baseline_glucose"
                type="number"
                step="0.01"
                min={1}
                placeholder="95.50"
                value={glucose}
                onChange={(e) => {
                  resetErrors()
                  setGlucose(e.target.value)
                }}
                onBlur={() => markTouched('glucose')}
                aria-invalid={Boolean(
                  (touched.glucose && biometricResult.errors.glucose) ||
                    fieldErrors.baseline_glucose
                )}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition duration-150 ${
                  (touched.glucose && biometricResult.errors.glucose) ||
                  fieldErrors.baseline_glucose
                    ? 'border-red-400 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                    : 'border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                }`}
              />
              <span className="text-[11px] text-slate-400 block mt-0.5">&gt; 0 mg/dL (max 2 dec)</span>
              {touched.glucose && biometricResult.errors.glucose && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {biometricResult.errors.glucose}
                </p>
              )}
              {fieldErrors.baseline_glucose && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {fieldErrors.baseline_glucose}
                </p>
              )}
            </div>
          </div>

          {/* Cross-Field Blood Pressure Sanity Check Alert */}
          {biometricResult.errors.bloodPressure && (
            <div
              role="alert"
              data-testid="bp-cross-validation-error"
              className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{biometricResult.errors.bloodPressure}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition duration-150 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!isFormValid || loading}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-150 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {loading ? (
            <>
              <svg
                data-testid="submit-spinner"
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Registering Patient…
            </>
          ) : (
            'Complete Registration'
          )}
        </button>
      </div>
    </form>
  )
}
