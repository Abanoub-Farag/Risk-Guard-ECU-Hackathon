import { describe, it, expect } from 'vitest';
import { validateAdjudicationAction } from '../utils/adjudication.validator';

describe('adjudication.validator', () => {
  it('rejects APPROVE without valid clinical notes', () => {
    const result = validateAdjudicationAction('APPROVE', 'short');
    expect(result.isValid).toBe(false);
    expect(result.errors.clinical_notes).toBeDefined();
  });

  it('accepts APPROVE with valid clinical notes', () => {
    const result = validateAdjudicationAction('APPROVE', 'Valid clinical note here');
    expect(result.isValid).toBe(true);
    expect(result.errors.clinical_notes).toBeUndefined();
  });

  it('rejects REJECT missing category', () => {
    const result = validateAdjudicationAction('REJECT', 'Valid clinical note here');
    expect(result.isValid).toBe(false);
    expect(result.errors.rejection_reason_category).toBeDefined();
  });

  it('accepts REJECT with category and notes', () => {
    const result = validateAdjudicationAction('REJECT', 'Valid clinical note here', 'FRAUD_DATA_FABRICATION');
    expect(result.isValid).toBe(true);
  });
});
