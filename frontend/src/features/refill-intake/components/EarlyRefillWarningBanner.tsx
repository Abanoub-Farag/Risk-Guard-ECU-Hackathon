import type { ReactNode } from 'react'
import type { TimelineValidationResult } from '../types/refill.types'

interface EarlyRefillWarningBannerProps {
  validation: TimelineValidationResult
}

export function EarlyRefillWarningBanner({
  validation,
}: EarlyRefillWarningBannerProps): ReactNode {
  if (!validation.isBlocked) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-200 text-amber-800">
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <div className="flex-1 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-amber-900">
            Early Refill Guardrail Active
          </span>
          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800">
            {validation.daysRemaining} {validation.daysRemaining === 1 ? 'day' : 'days'} remaining
          </span>
        </div>
        <p className="mt-1 text-amber-800 leading-relaxed">
          Prescription refill interval must be at least 25 days from the last dispensing event.
          Earliest allowable submission date:{' '}
          <strong className="font-semibold underline">
            {validation.formattedEarliestDate ?? 'N/A'}
          </strong>
          . Form submission is disabled to prevent insurance claim rejection.
        </p>
      </div>
    </div>
  )
}
