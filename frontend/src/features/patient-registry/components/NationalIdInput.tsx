import type { NationalIdParseResult } from '../types/patient.types'

export interface NationalIdInputProps {
  value: string
  onChange: (val: string) => void
  onBlur: () => void
  error?: string
  parsedId: NationalIdParseResult | null
  disabled?: boolean
}

export default function NationalIdInput({
  value,
  onChange,
  onBlur,
  error,
  parsedId,
  disabled = false,
}: NationalIdInputProps) {
  const hasError = Boolean(error)
  const isValid = Boolean(parsedId?.isValid)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor="national_id_field"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
        >
          Egyptian National ID <span className="text-red-500">*</span>
        </label>
        <span className="font-mono text-xs text-slate-400">
          {value.length}/14 digits
        </span>
      </div>

      <div className="relative">
        <input
          id="national_id_field"
          name="national_id"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          placeholder="28505140101235"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          maxLength={14}
          aria-invalid={hasError}
          aria-describedby={hasError ? 'national_id_error' : 'national_id_parsed'}
          className={`w-full rounded-lg border px-3.5 py-2.5 font-mono text-sm tracking-widest outline-none transition duration-150 ${
            hasError
              ? 'border-red-400 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-200'
              : isValid
              ? 'border-emerald-400 bg-emerald-50/20 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
              : 'border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
          }`}
        />
      </div>

      {hasError && (
        <p
          id="national_id_error"
          role="alert"
          className="text-xs font-medium text-red-600"
        >
          {error}
        </p>
      )}

      {isValid && parsedId && (
        <div
          id="national_id_parsed"
          data-testid="national-id-parsed-badge"
          className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900 sm:grid-cols-4"
        >
          <div>
            <span className="block font-medium text-emerald-600">Birth Date:</span>
            <span className="font-semibold">{parsedId.birthDateFormatted}</span>
          </div>
          <div>
            <span className="block font-medium text-emerald-600">Governorate:</span>
            <span className="font-semibold">{parsedId.governorate}</span>
          </div>
          <div>
            <span className="block font-medium text-emerald-600">Gender:</span>
            <span className="font-semibold">{parsedId.gender}</span>
          </div>
          <div>
            <span className="block font-medium text-emerald-600">Calculated Age:</span>
            <span className="font-semibold">{parsedId.age} yrs</span>
          </div>
        </div>
      )}
    </div>
  )
}
