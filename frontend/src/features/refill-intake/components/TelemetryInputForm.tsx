import type { ReactNode } from 'react'

interface TelemetryInputFormProps {
  systolic: number | ''
  diastolic: number | ''
  glucose: number | ''
  onSystolicChange: (value: number | '') => void
  onDiastolicChange: (value: number | '') => void
  onGlucoseChange: (value: number | '') => void
  disabled?: boolean
}

export function TelemetryInputForm({
  systolic,
  diastolic,
  glucose,
  onSystolicChange,
  onDiastolicChange,
  onGlucoseChange,
  disabled = false,
}: TelemetryInputFormProps): ReactNode {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-base font-semibold text-slate-900">
          2. Manual Telemetry Entry
        </h2>
        <p className="text-xs text-slate-500">
          Enter the patient's recent biometric readings to evaluate triage routing.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div>
          <label
            htmlFor="systolic-input"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
          >
            Systolic (mmHg) *
          </label>
          <input
            id="systolic-input"
            type="number"
            min="50"
            max="300"
            required
            disabled={disabled}
            value={systolic}
            onChange={(e) =>
              onSystolicChange(e.target.value ? Number(e.target.value) : '')
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
            placeholder="e.g. 120"
          />
        </div>

        <div>
          <label
            htmlFor="diastolic-input"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
          >
            Diastolic (mmHg) *
          </label>
          <input
            id="diastolic-input"
            type="number"
            min="30"
            max="200"
            required
            disabled={disabled}
            value={diastolic}
            onChange={(e) =>
              onDiastolicChange(e.target.value ? Number(e.target.value) : '')
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
            placeholder="e.g. 80"
          />
        </div>

        <div>
          <label
            htmlFor="glucose-input"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
          >
            Glucose (mg/dL)
          </label>
          <input
            id="glucose-input"
            type="number"
            min="40"
            max="600"
            step="0.1"
            disabled={disabled}
            value={glucose}
            onChange={(e) =>
              onGlucoseChange(e.target.value ? Number(e.target.value) : '')
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
            placeholder="Optional"
          />
        </div>
      </div>
    </div>
  )
}
