import { Link, useNavigate } from 'react-router-dom'
import BiometricInputGroup from '../components/BiometricInputGroup'
import NationalIdInput from '../components/NationalIdInput'
import { usePatientRegistration } from '../hooks/usePatientRegistration'
import type { Patient } from '../types/patient.types'

export interface PatientRegistrationPageProps {
  onSuccess?: (patient: Patient) => void
  onCancel?: () => void
  isModal?: boolean
}

export default function PatientRegistrationPage({
  onSuccess,
  onCancel,
  isModal = false,
}: PatientRegistrationPageProps) {
  const navigate = useNavigate()

  const {
    form,
    parsedId,
    vitalsResult,
    nationalIdError,
    fieldErrors,
    apiError,
    isSubmitting,
    isFormValid,
    touched,
    setField,
    markTouched,
    handleSubmit,
  } = usePatientRegistration({
    onSuccess: (newPatient) => {
      if (onSuccess) {
        onSuccess(newPatient)
      } else {
        navigate(`/patients/${newPatient.id}`)
      }
    },
  })

  return (
    <div className={isModal ? 'w-full' : 'max-w-3xl mx-auto space-y-6'}>
      {!isModal && (
        <div className="flex items-center gap-3">
          <Link
            to="/patients"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
            title="Back to Patients"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">New Patient Registration</h1>
            <p className="text-xs text-slate-500">
              Register a chronic patient profile into RiskGuard Registry
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className={`rounded-xl bg-white ${
          isModal ? 'p-0' : 'p-6 sm:p-8 shadow-sm border border-slate-200'
        } space-y-6`}
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
            <svg
              className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <span className="font-semibold block">Registration Error</span>
              <span>{apiError}</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* National ID controlled component */}
          <NationalIdInput
            value={form.nationalId}
            onChange={(val) => setField('nationalId', val)}
            onBlur={() => markTouched('nationalId')}
            error={nationalIdError || fieldErrors.national_id}
            parsedId={parsedId}
            disabled={isSubmitting}
          />

          {/* Full Name */}
          <div>
            <label
              htmlFor="full_name_field"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="full_name_field"
              name="full_name"
              type="text"
              disabled={isSubmitting}
              placeholder="Mohamed Ahmed Mahmoud"
              value={form.fullName}
              onChange={(e) => setField('fullName', e.target.value)}
              onBlur={() => markTouched('fullName')}
              aria-invalid={Boolean(
                (touched.fullName && form.fullName.trim().length < 3) || fieldErrors.full_name
              )}
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition duration-150 ${
                (touched.fullName && form.fullName.trim().length < 3) || fieldErrors.full_name
                  ? 'border-red-400 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                  : 'border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
              }`}
            />
            {((touched.fullName && form.fullName.trim().length < 3) ||
              fieldErrors.full_name) && (
              <p className="mt-1.5 text-xs text-red-600 font-medium">
                {fieldErrors.full_name || 'Full name must contain at least 3 characters'}
              </p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label
              htmlFor="phone_number_field"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              id="phone_number_field"
              name="phone_number"
              type="tel"
              disabled={isSubmitting}
              placeholder="01012345678"
              value={form.phoneNumber}
              onChange={(e) => setField('phoneNumber', e.target.value)}
              onBlur={() => markTouched('phoneNumber')}
              aria-invalid={Boolean(
                (touched.phoneNumber && form.phoneNumber.trim().length < 8) ||
                  fieldErrors.phone_number
              )}
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition duration-150 ${
                (touched.phoneNumber && form.phoneNumber.trim().length < 8) ||
                fieldErrors.phone_number
                  ? 'border-red-400 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                  : 'border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
              }`}
            />
            <p className="mt-1 text-xs text-slate-400">
              Local Egyptian format (e.g. 01012345678 or +201012345678)
            </p>
            {((touched.phoneNumber && form.phoneNumber.trim().length < 8) ||
              fieldErrors.phone_number) && (
              <p className="mt-1.5 text-xs text-red-600 font-medium">
                {fieldErrors.phone_number || 'Valid contact phone number is required'}
              </p>
            )}
          </div>

          {/* Biometrics group */}
          <BiometricInputGroup
            systolic={form.systolic}
            diastolic={form.diastolic}
            glucose={form.glucose}
            onSystolicChange={(val) => setField('systolic', val)}
            onDiastolicChange={(val) => setField('diastolic', val)}
            onGlucoseChange={(val) => setField('glucose', val)}
            onSystolicBlur={() => markTouched('systolic')}
            onDiastolicBlur={() => markTouched('diastolic')}
            onGlucoseBlur={() => markTouched('glucose')}
            touched={touched}
            errors={vitalsResult.errors}
            serverErrors={fieldErrors}
            disabled={isSubmitting}
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          {(onCancel || isModal) && (
            <button
              type="button"
              onClick={onCancel ?? (() => navigate('/patients'))}
              disabled={isSubmitting}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition duration-150 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-150 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {isSubmitting ? (
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
    </div>
  )
}
