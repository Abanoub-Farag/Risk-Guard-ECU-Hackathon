import { apiClient } from './client'

export type VoucherStatus = 'ACTIVE' | 'DISPENSED' | 'EXPIRED' | 'CANCELLED'

export interface PharmacyVoucher {
  id: string
  refill_request_id: string
  voucher_code: string
  status: VoucherStatus
  expires_at: string
  dispensed_at: string | null
  dispensing_pharmacy_id: string | null
  medication_name: string
  dosage: string
  patient_name: string
}

export interface POSVoucherLookup {
  voucher_code: string
  status: VoucherStatus
  expires_at: string
  dispensed_at: string | null
  dispensing_pharmacy_id: string | null
  medication_name: string
  dosage: string
  patient_name: string
  masked_national_id: string
}

export interface POSRedemptionConfirmation {
  id: string
  refill_request_id: string
  voucher_code: string
  status: VoucherStatus
  expires_at: string
  dispensed_at: string
  dispensing_pharmacy_id: string
  medication_name: string
  dosage: string
  patient_name: string
}

export interface POSRedeemInput {
  voucher_code: string
  national_id: string
  dispensing_pharmacy_id: string
}

export interface VoucherView {
  code: string
  refill_id: string
  medication_name: string
  dosage: string
  patient_name: string
  patient_national_id: string
  masked_national_id: string
  status: 'ACTIVE' | 'REDEEMED'
  expires_at: string
  dispensed_at: string | null
}

export const vouchersApi = {
  lookup: async (voucherCode: string): Promise<POSVoucherLookup> => {
    const response = await apiClient.get<POSVoucherLookup>(
      `vouchers/${voucherCode}`
    )
    return response.data
  },

  redeem: async (input: POSRedeemInput): Promise<POSRedemptionConfirmation> => {
    const response = await apiClient.post<POSRedemptionConfirmation>(
      'vouchers/redeem',
      input
    )
    return response.data
  },

  getByRefillId: async (
    refillRequestId: string
  ): Promise<PharmacyVoucher> => {
    const response = await apiClient.get<PharmacyVoucher>(
      `refill-requests/${refillRequestId}/voucher`
    )
    return response.data
  },
}