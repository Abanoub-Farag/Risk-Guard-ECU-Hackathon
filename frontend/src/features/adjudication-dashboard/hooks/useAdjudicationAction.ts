import { useState } from 'react';
import { type SubmitAdjudicationDTO } from '../types/adjudication.types';
import { submitAdjudication } from '../services/adjudication.api';

export function useAdjudicationAction(claimId: string) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeAction = async (payload: SubmitAdjudicationDTO) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await submitAdjudication(claimId, payload);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { executeAction, isSubmitting, error };
}
