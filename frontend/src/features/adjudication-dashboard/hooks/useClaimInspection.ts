import { useState, useEffect } from 'react';
import { type ClaimDetailResponse } from '../types/adjudication.types';
import { fetchClaimDetail } from '../services/adjudication.api';

export function useClaimInspection(claimId: string) {
  const [claim, setClaim] = useState<ClaimDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!claimId) return;
    
    let mounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await fetchClaimDetail(claimId);
        if (mounted) setClaim(data);
      } catch (err: any) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [claimId]);

  return { claim, isLoading, error };
}
