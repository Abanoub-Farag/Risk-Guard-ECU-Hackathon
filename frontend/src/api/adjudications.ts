import { apiClient } from './client'
import type { RefillStatus } from './refills'
import type { TriageColor, AnomalyReason } from './triage'

export type AdjudicationDecision = 'APPROVE' | 'REJECT'

export type RejectionReasonCategory =
  | 'UNVERIFIABLE_DEVICE_IMAGE'
  | 'SUSPECTED_FRAUD_TAMPERING'
  | 'PHYSIOLOGICAL_DANGER'
  | 'CLINICAL_CONTRAINDICATION'
  | 'EXCESSIVE_DOSAGE_VARIANCE'
  | 'OTHER'

export interface AdjudicationQueueItem {
  id: string
  patient_id: string
  patient_name: string
  patient_national_id: string
  prescription_id: string
  medication_name: string
  status: RefillStatus
  triage_color: TriageColor | null
  anomaly_reason: AnomalyReason | null
  missed_doses_past_week: number
  has_severe_symptoms: boolean
  submitted_at: string
}

export interface AdjudicationClaim {
  refill_request_id: string
  status: RefillStatus
  submitted_at: string
  missed_doses_past_week: number
  has_severe_symptoms: boolean
  patient: {
    id: string
    national_id: string
    full_name: string
    phone_number: string
    baseline_systolic: number
    baseline_diastolic: number
    baseline_glucose: number | null
  }
  prescription: {
    id: string
    medication_name: string
    dosage: string
    refill_interval_days: number
  }
  triage: {
    triage_color: TriageColor
    anomaly_reason: AnomalyReason | null
    evaluated_at: string
  } | null
  current_scan: {
    id: string
    device_type: string
    image_storage_uri: string
    captured_at: string
  } | null
  current_ocr: {
    id: string
    confidence_score: string
    systolic: number | null
    diastolic: number | null
    glucose: string | null
    raw_payload: Record<string, unknown>
    processed_at: string
  } | null
  prior_cycle_ocr: {
    id: string
    confidence_score: string
    systolic: number | null
    diastolic: number | null
    glucose: string | null
    processed_at: string
  } | null
  adjudication: {
    id: string
    refill_request_id: string
    reviewer_user_id: string
    decision: AdjudicationDecision
    rejection_reason_category: RejectionReasonCategory | null
    clinical_notes: string
    decided_at: string
  } | null
}

export interface AdjudicationInput {
  decision: AdjudicationDecision
  rejection_reason_category?: RejectionReasonCategory | null
  clinical_notes: string
  reviewer_user_id?: string | null
}

export interface ManualAdjudicationOutput {
  id: string
  refill_request_id: string
  reviewer_user_id: string
  decision: AdjudicationDecision
  rejection_reason_category: RejectionReasonCategory | null
  clinical_notes: string
  decided_at: string
}

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  limit: number
  offset: number
  results: T[]
}

export const adjudicationsApi = {
  listQueue: async (
    triageColor?: TriageColor
  ): Promise<Paginated<AdjudicationQueueItem>> => {
    const response = await apiClient.get<Paginated<AdjudicationQueueItem>>(
      'adjudications/queue',
      {
        params: triageColor ? { triage_color: triageColor } : undefined,
      }
    )
    return response.data
  },

  getClaim: async (
    refillRequestId: string
  ): Promise<AdjudicationClaim> => {
    const response = await apiClient.get<AdjudicationClaim>(
      `adjudications/queue/${refillRequestId}`
    )
    return response.data
  },

  adjudicate: async (
    refillId: string,
    input: AdjudicationInput
  ): Promise<ManualAdjudicationOutput> => {
    const response = await apiClient.post<ManualAdjudicationOutput>(
      `refill-requests/${refillId}/adjudicate`,
      input
    )
    return response.data
  },
}