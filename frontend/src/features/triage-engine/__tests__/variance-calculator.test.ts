import { describe, it, expect } from 'vitest';
import { calculateVariancePercentage, isVarianceAcceptable } from '../utils/variance-calculator';

describe('variance-calculator', () => {
  it('calculates variance accurately', () => {
    expect(calculateVariancePercentage(120, 100)).toBe(20);
    expect(calculateVariancePercentage(80, 100)).toBe(-20);
  });

  it('accepts exact +20% and -20% boundaries', () => {
    expect(isVarianceAcceptable(20)).toBe(true);
    expect(isVarianceAcceptable(-20)).toBe(true);
  });

  it('flags threshold breaches at +20.1% and -20.1%', () => {
    expect(isVarianceAcceptable(20.1)).toBe(false);
    expect(isVarianceAcceptable(-20.1)).toBe(false);
  });
});
