export type VoucherStatus = 'ACTIVE' | 'DISPENSED' | 'EXPIRED' | 'CANCELLED';

export interface PharmacyVoucher {
  id: string;
  voucher_code: string; // 16-char alphanumeric
  status: VoucherStatus;
  expires_at: string;
  issued_at: string;
  patient_name: string;
  national_id: string;
  medication_name: string;
  dosage: string;
  refill_interval_days: number;
}

export interface RedeemVoucherDTO {
  voucher_code: string;
  national_id: string;
  dispensing_pharmacy_id: string;
}

export interface VoucherVerificationResponse {
  valid: boolean;
  voucher: PharmacyVoucher;
}

export interface ApiErrorResponse {
  detail: string;
  code?: string;
  status?: number;
}
