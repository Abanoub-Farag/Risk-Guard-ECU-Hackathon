import { type ProcessOcrDTO, type TriageSummaryResponse } from '../types/triage.types';

const API_BASE_URL = '/api/v1';

export async function processOcrRequest(refillRequestId: string, payload: ProcessOcrDTO): Promise<TriageSummaryResponse> {
  const response = await fetch(`${API_BASE_URL}/refill-requests/${refillRequestId}/process-ocr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = 'Failed to process OCR';
    try {
      const errorData = await response.json();
      errorMsg = errorData.detail || errorMsg;
    } catch {
      // Fallback
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export async function fetchTriageRecord(refillRequestId: string): Promise<TriageSummaryResponse> {
  const response = await fetch(`${API_BASE_URL}/refill-requests/${refillRequestId}/triage`);
  
  if (!response.ok) {
    let errorMsg = 'Failed to fetch triage record';
    try {
      const errorData = await response.json();
      errorMsg = errorData.detail || errorMsg;
    } catch {
      // Fallback
    }
    throw new Error(errorMsg);
  }

  return response.json();
}
