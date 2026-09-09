import { describe, expect, it } from 'vitest'
import {
  EARLY_REFILL_THRESHOLD_DAYS,
  validateRefillTimeline,
} from '../utils/refill-timeline.validator'

describe('Refill Timeline Validator (25-Day Early Refill Guardrail)', () => {
  const MS_PER_HOUR = 60 * 60 * 1000
  const MS_PER_DAY = 24 * MS_PER_HOUR

  it('allows refill when last_dispensed_at is null (initial refill)', () => {
    const result = validateRefillTimeline(null)
    expect(result.isBlocked).toBe(false)
    expect(result.earliestAllowableDate).toBeNull()
    expect(result.daysRemaining).toBe(0)
    expect(result.formattedEarliestDate).toBeNull()
  })

  it('allows refill when last_dispensed_at is undefined', () => {
    const result = validateRefillTimeline(undefined)
    expect(result.isBlocked).toBe(false)
    expect(result.earliestAllowableDate).toBeNull()
    expect(result.daysRemaining).toBe(0)
  })

  it('rejects refill request submitted at exactly 24 days', () => {
    const now = new Date('2026-09-10T12:00:00Z')
    // 24 days prior
    const lastDispensedAt = new Date(now.getTime() - 24 * MS_PER_DAY).toISOString()

    const result = validateRefillTimeline(lastDispensedAt, now)
    expect(result.isBlocked).toBe(true)
    expect(result.daysRemaining).toBe(1)
    expect(result.earliestAllowableDate).not.toBeNull()
    expect(result.reason).toContain('Early refill request blocked')
  })

  it('rejects refill request submitted at 24 days and 23 hours', () => {
    const now = new Date('2026-09-10T12:00:00Z')
    // 24 days and 23 hours prior (1 hour remaining until 25-day mark)
    const lastDispensedAt = new Date(
      now.getTime() - (24 * MS_PER_DAY + 23 * MS_PER_HOUR)
    ).toISOString()

    const result = validateRefillTimeline(lastDispensedAt, now)
    expect(result.isBlocked).toBe(true)
    expect(result.daysRemaining).toBe(1)
  })

  it('allows refill request submitted at exactly 25 days', () => {
    const now = new Date('2026-09-10T12:00:00Z')
    // Exactly 25 days prior
    const lastDispensedAt = new Date(now.getTime() - 25 * MS_PER_DAY).toISOString()

    const result = validateRefillTimeline(lastDispensedAt, now)
    expect(result.isBlocked).toBe(false)
    expect(result.daysRemaining).toBe(0)
    expect(result.earliestAllowableDate).not.toBeNull()
  })

  it('allows refill request submitted past 25 days (e.g. 30 days)', () => {
    const now = new Date('2026-09-10T12:00:00Z')
    const lastDispensedAt = new Date(now.getTime() - 30 * MS_PER_DAY).toISOString()

    const result = validateRefillTimeline(lastDispensedAt, now)
    expect(result.isBlocked).toBe(false)
    expect(result.daysRemaining).toBe(0)
  })

  it('handles invalid date strings gracefully without throwing', () => {
    const result = validateRefillTimeline('invalid-date-format')
    expect(result.isBlocked).toBe(false)
    expect(result.reason).toBe('Invalid last dispensed date format.')
  })

  it('calculates accurate days remaining when requested early (e.g. 10 days in)', () => {
    const now = new Date('2026-09-10T12:00:00Z')
    // 10 days since last dispensed => 15 days remaining until 25 days
    const lastDispensedAt = new Date(now.getTime() - 10 * MS_PER_DAY).toISOString()

    const result = validateRefillTimeline(lastDispensedAt, now)
    expect(result.isBlocked).toBe(true)
    expect(result.daysRemaining).toBe(15)
  })

  it('exposes constant EARLY_REFILL_THRESHOLD_DAYS as 25', () => {
    expect(EARLY_REFILL_THRESHOLD_DAYS).toBe(25)
  })
})
