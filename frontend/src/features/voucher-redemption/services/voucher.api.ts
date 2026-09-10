import { type PharmacyVoucher, type RedeemVoucherDTO, type VoucherVerificationResponse } from '../types/voucher.types';

const API_BASE_URL = '/api/v1';

export async function fetchVoucherDetails(voucherId: string): Promise<PharmacyVoucher> {
  const response = await fetch(`${API_BASE_URL}/vouchers/${voucherId}`);
  if (!response.ok) throw new Error('Failed to load voucher details');
  return response.json();
}

export async function verifyVoucher(voucherCode: string): Promise<VoucherVerificationResponse> {
  const response = await fetch(`${API_BASE_URL}/vouchers/verify?code=${encodeURIComponent(voucherCode)}`);
  
  if (!response.ok) {
    if (response.status === 404) throw new Error('Invalid voucher code. Please re-enter or scan again.');
    if (response.status === 410 || response.status === 422) throw new Error('This voucher has passed the 96-hour dispensing validity window.');
    throw new Error('Verification failed.');
  }

  return response.json();
}

export async function redeemVoucher(payload: RedeemVoucherDTO): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/vouchers/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 403) throw new Error('National ID does not match the patient associated with this voucher.');
    if (response.status === 409) throw new Error('This voucher has already been redeemed and dispensed.');
    throw new Error('Failed to redeem voucher.');
  }
}
