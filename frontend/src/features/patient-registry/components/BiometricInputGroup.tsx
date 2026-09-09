import type { VitalsValidationErrors } from '../types/patient.types'

export interface BiometricInputGroupProps {
  systolic: string
  diastolic: string
  glucose: string
  onSystolicChange: (val: string) => void
  onDiastolicChange: (val: string) => void
  onGlucoseChange: (val: string) => void
  onSystolicBlur: () => void
  onDiastolicBlur: () => void
  onGlucoseBlur: () => void
  touched: Record<string, boolean>
  errors: VitalsValidationErrors
  serverErrors?: Record<string, string>
  disabled?: boolean
}

export default function BiometricInputGroup({
  systolic,
  diastolic,
  glucose,
  onSystolicChange,
  onDiastolicChange,
  onGlucoseChange,
  onSystolicBlur,
  onDiastolicBlur,
  onGlucoseBlur,
  touched,
  errors,
  serverErrors = {},
  disabled = false,
}: BiometricInputGroupProps) {
  const systolicError =
    (touched.systolic && errors.systolic) || serverErrors.baseline_systolic
  const diastolicError =
    (touched.diastolic && errors.diastolic) || serverErrors.baseline_diastolic
  const glucoseError =
    (touched.glucose && errors.glucose) || serverErrors.baseline_glucose
  const crossFieldError = errors.bloodPressure

  return (
    <div className="space-y-3 pt-2 border-t border-slate-100">
      <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">
        Baseline Biometric Anchors
      </span>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Systolic */}
        <div>
          <label
            htmlFor="baseline_systolic"
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            Systolic (mmHg) <span className="text-red-500">*</span>
          </label>
          <input
            id="baseline_systolic"
            name="baseline_systolic"
            type="number"
            min={50}
            max={300}
            disabled={disabled}
            placeholder="120"
            value={systolic}
            onChange={(e) => onSystolicChange(e.target.value)}
            onBlur={onSystolicBlur}
            aria-invalid={Boolean(systolicError)}
            aria-describedby={systolicError ? 'systolic_error' : undefined}
            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition duration-150 ${
              systolicError
                ? 'border-red-400 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                : 'border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
            }`}
          />
          <span className="text-[11px] text-slate-400 block mt-0.5">Range: 50–300</span>
          {systolicError && (
            <p id="systolic_error" role="alert" className="mt-1 text-xs text-red-600 font-medium">
              {systolicError}
            </p>
          )}
        </div>

        {/* Diastolic */}
        <div>
          <label
            htmlFor="baseline_diastolic"
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            Diastolic (mmHg) <span className="text-red-500">*</span>
          </label>
          <input
            id="baseline_diastolic"
            name="baseline_diastolic"
            type="number"
            min={30}
            max={200}
            disabled={disabled}
            placeholder="80"
            value={diastolic}
            onChange={(e) => onDiastolicChange(e.target.value)}
            onBlur={onDiastolicBlur}
            aria-invalid={Boolean(diastolicError)}
            aria-describedby={diastolicError ? 'diastolic_error' : undefined}
            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition duration-150 ${
              diastolicError
                ? 'border-red-400 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                : 'border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
            }`}
          />
          <span className="text-[11px] text-slate-400 block mt-0.5">Range: 30–200</span>
          {diastolicError && (
            <p id="diastolic_error" role="alert" className="mt-1 text-xs text-red-600 font-medium">
              {diastolicError}
            </p>
          )}
        </div>

        {/* Fasting Glucose */}
        <div>
          <label
            htmlFor="baseline_glucose"
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            Glucose (mg/dL) <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="baseline_glucose"
            name="baseline_glucose"
            type="number"
            step="0.01"
            min={1}
            disabled={disabled}
            placeholder="95.50"
            value={glucose}
            onChange={(e) => onGlucoseChange(e.target.value)}
            onBlur={onGlucoseBlur}
            aria-invalid={Boolean(glucoseError)}
            aria-describedby={glucoseError ? 'glucose_error' : undefined}
            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition duration-150 ${
              glucoseError
                ? 'border-red-400 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                : 'border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
            }`}
          />
          <span className="text-[11px] text-slate-400 block mt-0.5">&gt; 0 mg/dL (max 2 dec)</span>
          {glucoseError && (
            <p id="glucose_error" role="alert" className="mt-1 text-xs text-red-600 font-medium">
              {glucoseError}
            </p>
          )}
        </div>
      </div>

      {/* Cross-Field Blood Pressure Sanity Check Alert */}
      {crossFieldError && (
        <div
          role="alert"
          data-testid="bp-cross-validation-error"
          className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-center gap-2"
        >
          <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{crossFieldError}</span>
        </div>
      )}
    </div>
  )
}
