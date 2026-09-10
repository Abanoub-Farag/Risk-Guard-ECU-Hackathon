import { useState } from 'react';
import { processOcrRequest } from '../services/triage.api';
import { type ProcessOcrDTO, type TriageSummaryResponse } from '../types/triage.types';

export function useOcrTrigger(refillRequestId: string) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TriageSummaryResponse | null>(null);

  const triggerOcr = async (payload: ProcessOcrDTO) => {
    setIsProcessing(true);
    setError(null);
    try {
      const data = await processOcrRequest(refillRequestId, payload);
      setResult(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'An error occurred during OCR processing');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  return { triggerOcr, isProcessing, error, result };
}
