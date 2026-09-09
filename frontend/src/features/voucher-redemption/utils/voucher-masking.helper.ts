export function formatVoucherCode(code: string): string {
  const clean = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const match = clean.match(/.{1,4}/g);
  return match ? match.join('-') : clean;
}

export function maskNationalId(nationalId: string): string {
  if (!nationalId || nationalId.length !== 14) return nationalId;
  const prefix = nationalId.substring(0, 7);
  const suffix = nationalId.substring(13);
  return `${prefix}******${suffix}`;
}
