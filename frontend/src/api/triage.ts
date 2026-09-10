import { apiClient } from './client'

export type TriageColor = 'GREEN' | 'YELLOW' | 'RED'

export type AnomalyReason =
  | 'PHYSIOLOGICAL_IMPOSSIBILITY'
  | 'SUSPECTED_DATA_FABRICATION'
  | 'CLINICAL_VARIANCE_EXCEEDED'
  | 'SEVERE_SYMPTOMS_REPORTED'

export interface IntakeTelemetry {
  id: string
  refill_request_id: string
  systolic: number | null
  diastolic: number | null
  glucose: string | null
  processed_at: string
}

export interface TriageRecord {
  id: string
  refill_request_id: string
  triage_color: TriageColor
  anomaly_reason: AnomalyReason | null
  evaluated_at: string
  refill_request_status: string
  telemetry: IntakeTelemetry | null
}

export interface ProcessIntakeInput {
  systolic: number
  diastolic: number
  glucose?: number | null
}

export const triageApi = {
  processIntake: async (
    refillId: string,
    input: ProcessIntakeInput
  ): Promise<TriageRecord> => {
    const response = await apiClient.post<TriageRecord>(
      `refill-requests/${refillId}/process-intake/`,
      input
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