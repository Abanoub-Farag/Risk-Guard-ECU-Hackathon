import { apiClient } from './client'

export type TriageColor = 'GREEN' | 'YELLOW' | 'RED'

export type AnomalyReason =
  | 'PHYSIOLOGICAL_IMPOSSIBILITY'
  | 'SUSPECTED_DATA_FABRICATION'
  | 'LOW_OCR_CONFIDENCE'
  | 'CLINICAL_VARIANCE_EXCEEDED'
  | 'SEVERE_SYMPTOMS_REPORTED'

export interface OCRResult {
  id: string
  refill_request_id: string
  confidence_score: string
  systolic: number | null
  diastolic: number | null
  glucose: string | null
  raw_payload: Record<string, unknown>
  processed_at: string
}

export interface TriageRecord {
  id: string
  refill_request_id: string
  triage_color: TriageColor
  anomaly_reason: AnomalyReason | null
  evaluated_at: string
  refill_request_status: string
  ocr_result: OCRResult | null
}

export interface ProcessOCRInput {
  scan_id?: string | null
  systolic?: number | null
  diastolic?: number | null
  glucose?: number | null
  confidence_score?: number | null
  raw_payload?: Record<string, unknown> | null
}

export const triageApi = {
  processOCR: async (
    refillId: string,
    input?: ProcessOCRInput
  ): Promise<TriageRecord> => {
    const response = await apiClient.post<TriageRecord>(
      `refill-requests/${refillId}/process-ocr`,
      input ?? {}
    )
    return response.data
  },

  getByRefillId: async (refillId: string): Promise<TriageRecord | null> => {
    const response = await apiClient.get<TriageRecord>(
      `refill-requests/${refillId}/triage`
    )
    return response.data
  },
}