import { useState, useEffect } from 'react';
import { PharmacyVoucher } from '../types/voucher.types';
import { fetchVoucherDetails } from '../services/voucher.api';

export function useVoucherDetails(voucherId: string) {
  const [voucher, setVoucher] = useState<PharmacyVoucher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await fetchVoucherDetails(voucherId);
        if (mounted) setVoucher(data);
      } catch (err: any) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    if (voucherId) load();
    return () => { mounted = false; };
  }, [voucherId]);

  return { voucher, setVoucher, isLoading, error };
}
