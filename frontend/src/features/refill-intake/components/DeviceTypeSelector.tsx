import type { ReactNode } from 'react'
import type { DeviceType } from '../types/refill.types'

interface DeviceTypeSelectorProps {
  selectedType: DeviceType
  onChange: (type: DeviceType) => void
  disabled?: boolean
}

export function DeviceTypeSelector({
  selectedType,
  onChange,
  disabled = false,
}: DeviceTypeSelectorProps): ReactNode {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
        Biometric Device Screen Type
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange('BLOOD_PRESSURE')}
          disabled={disabled}
          className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
            selectedType === 'BLOOD_PRESSURE'
              ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              selectedType === 'BLOOD_PRESSURE'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <span className="block text-sm font-semibold text-slate-900">
              Blood Pressure Monitor
            </span>
            <span className="mt-0.5 block text-xs text-slate-500 leading-normal">
              Capture LCD reading displaying Systolic, Diastolic, and Pulse rate.
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChange('GLUCOMETER')}
          disabled={disabled}
          className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
            selectedType === 'GLUCOMETER'
              ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              selectedType === 'GLUCOMETER'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <span className="block text-sm font-semibold text-slate-900">
              Glucometer
            </span>
            <span className="mt-0.5 block text-xs text-slate-500 leading-normal">
              Capture LCD reading displaying Blood Glucose (mg/dL) test result.
            </span>
          </div>
        </button>
      </div>
    </div>
  )
}
