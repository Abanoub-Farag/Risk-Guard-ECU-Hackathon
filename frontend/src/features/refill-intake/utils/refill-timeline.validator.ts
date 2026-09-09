import type { TimelineValidationResult } from '../types/refill.types'

export const EARLY_REFILL_THRESHOLD_DAYS = 25
const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Evaluates the 25-day early refill blocker constraint.
 * Invariant: current_time < last_dispensed_at + 25 days => BLOCKED
 *
 * @param lastDispensedAt ISO string or Date of the prescription's last dispense event.
 * @param currentTime Optional reference time, defaults to new Date().
 */
export function validateRefillTimeline(
  lastDispensedAt: string | Date | null | undefined,
  currentTime: Date = new Date()
): TimelineValidationResult {
  if (!lastDispensedAt) {
    return {
      isBlocked: false,
      earliestAllowableDate: null,
      daysRemaining: 0,
      formattedEarliestDate: null,
    }
  }

  const dispensedTime =
    typeof lastDispensedAt === 'string'
      ? new Date(lastDispensedAt)
      : lastDispensedAt

  if (isNaN(dispensedTime.getTime())) {
    return {
      isBlocked: false,
      earliestAllowableDate: null,
      daysRemaining: 0,
      formattedEarliestDate: null,
      reason: 'Invalid last dispensed date format.',
    }
  }

  const earliestAllowableDate = new Date(
    dispensedTime.getTime() + EARLY_REFILL_THRESHOLD_DAYS * MS_PER_DAY
  )

  const diffMs = earliestAllowableDate.getTime() - currentTime.getTime()

  if (diffMs > 0) {
    const daysRemaining = Math.max(1, Math.ceil(diffMs / MS_PER_DAY))
    return {
      isBlocked: true,
      earliestAllowableDate,
      daysRemaining,
      formattedEarliestDate: formatDate(earliestAllowableDate),
      reason: `Early refill request blocked. Current interval is less than 25 days. Earliest allowable submission date: ${earliestAllowableDate.toISOString()}.`,
    }
  }

  return {
    isBlocked: false,
    earliestAllowableDate,
    daysRemaining: 0,
    formattedEarliestDate: formatDate(earliestAllowableDate),
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
