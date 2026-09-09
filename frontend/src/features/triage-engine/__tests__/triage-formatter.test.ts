import { describe, it, expect } from 'vitest';
import { formatAnomalyReason } from '../utils/triage-formatter';
import { AnomalyReason } from '../types/triage.types';

describe('triage-formatter', () => {
  it('formats all enum values into friendly text', () => {
    expect(formatAnomalyReason(AnomalyReason.LOW_OCR_CONFIDENCE)).toBe('Low Extraction Confidence');
    expect(formatAnomalyReason(AnomalyReason.PHYSIOLOGICAL_IMPOSSIBILITY)).toBe('Physiological Impossibility Detected');
    expect(formatAnomalyReason(AnomalyReason.SUSPECTED_DATA_FABRICATION)).toBe('Suspected Data Fabrication');
    expect(formatAnomalyReason(AnomalyReason.CLINICAL_VARIANCE_EXCEEDED)).toBe('Baseline Variance Exceeded');
    expect(formatAnomalyReason(AnomalyReason.NONE)).toBe('Automated Clinical Clearance - Approved');
  });
});
