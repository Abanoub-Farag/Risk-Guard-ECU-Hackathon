import { useState } from 'react';
import { verifyVoucher, redeemVoucher } from '../services/voucher.api';
import { type PharmacyVoucher, type RedeemVoucherDTO } from '../types/voucher.types';

export function usePosRedemption(pharmacyId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedVoucher, setVerifiedVoucher] = useState<PharmacyVoucher | null>(null);
  const [inputNationalId, setInputNationalId] = useState<string>('');

  const handleVerify = async (voucherCode: string, nationalId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await verifyVoucher(voucherCode);
      if (result.valid) {
        setVerifiedVoucher(result.voucher);
        setInputNationalId(nationalId);
        
        if (result.voucher.national_id !== nationalId) {
          setError('National ID does not match the patient associated with this voucher.');
        }
      }
    } catch (err: any) {
      setError(err.message);
      setVerifiedVoucher(null);
    } finally {
      setIsLoading(false);
    }
  };

  const executeDispense = async () => {
    if (!verifiedVoucher) return false;
    
    setIsLoading(true);
    setError(null);
    try {
      const payload: RedeemVoucherDTO = {
        voucher_code: verifiedVoucher.voucher_code,
        national_id: inputNationalId,
        dispensing_pharmacy_id: pharmacyId,
      };
      await redeemVoucher(payload);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setVerifiedVoucher(null);
    setError(null);
    setInputNationalId('');
  };

  return { handleVerify, executeDispense, resetState, isLoading, error, verifiedVoucher, inputNationalId };
}
