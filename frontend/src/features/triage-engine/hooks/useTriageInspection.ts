import { useState, useEffect } from 'react';
import { fetchTriageRecord } from '../services/triage.api';
import { type TriageSummaryResponse } from '../types/triage.types';

export function useTriageInspection(refillRequestId: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triageData, setTriageData] = useState<TriageSummaryResponse | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadTriage = async () => {
      try {
        setIsLoading(true);
        const data = await fetchTriageRecord(refillRequestId);
        if (mounted) {
          setTriageData(data);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Error loading triage data');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    if (refillRequestId) {
      loadTriage();
    }

    return () => {
      mounted = false;
    };
  }, [refillRequestId]);

  return { isLoading, error, triageData };
}
