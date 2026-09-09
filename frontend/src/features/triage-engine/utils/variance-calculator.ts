export function calculateVariancePercentage(extracted: number, baseline: number): number {
  if (baseline === 0) return 0;
  return ((extracted - baseline) / baseline) * 100;
}

export function isVarianceAcceptable(variancePercentage: number, threshold: number = 20): boolean {
  return Math.abs(variancePercentage) <= threshold;
}
