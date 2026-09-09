import { describe, it, expect } from 'vitest';
import { formatVoucherCode, maskNationalId } from '../utils/voucher-masking.helper';

describe('voucher-masking.helper', () => {
  it('formats 16-character token chunking', () => {
    expect(formatVoucherCode('ABCDEFGHJKLMNPQR')).toBe('ABCD-EFGH-JKLM-NPQR');
  });

  it('masks National ID preserving first 7 and last digit', () => {
    // 14 digits length test
    expect(maskNationalId('29901011234568')).toBe('2990101******8');
  });
});
