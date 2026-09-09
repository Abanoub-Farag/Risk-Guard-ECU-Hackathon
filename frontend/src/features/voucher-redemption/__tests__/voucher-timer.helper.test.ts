import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateTimeRemaining, formatTimeRemaining } from '../utils/voucher-timer.helper';

describe('voucher-timer.helper', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-01T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates 95 hours remaining', () => {
    const expiresAt = '2026-09-05T09:00:00Z'; // +95 hours
    const result = calculateTimeRemaining(expiresAt);
    expect(result).toEqual({ hours: 95, minutes: 0, seconds: 0, isExpired: false });
  });

  it('triggers expiration state at 0 seconds remaining', () => {
    const expiresAt = '2026-09-01T10:00:00Z'; // exactly now
    const result = calculateTimeRemaining(expiresAt);
    expect(result.isExpired).toBe(true);
    expect(result.hours).toBe(0);
  });

  it('formats output correctly', () => {
    const formatted = formatTimeRemaining({ hours: 95, minutes: 5, seconds: 9, isExpired: false });
    expect(formatted).toBe('95:05:09');
  });
});
