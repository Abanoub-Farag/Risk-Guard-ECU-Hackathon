export type TriageColor = 'GREEN' | 'YELLOW' | 'RED';
export type AdjudicationDecision = 'APPROVE' | 'REJECT';
export type RejectionReasonCategory = 
  | 'FRAUD_DATA_FABRICATION' 
  | 'UNREADABLE_IMAGE' 
  | 'CLINICALLY_UNSAFE_READING' 
  | 'IDENTITY_MISMATCH';

export interface QueueItem {
  id: string;
  refill_request_id: string;
  patient_name: string;
  national_id: string;
  triage_color: TriageColor;
  anomaly_reason: string;
  submitted_at: string;
}

export interface ClaimDetailResponse extends QueueItem {
  extracted_metrics: {
    systolic: number;
    diastolic: number;
    glucose: number;
    confidence_score: number;
  };
  prior_metrics?: {
    systolic: number;
    diastolic: number;
    glucose: number;
  };
  questionnaire: {
    missed_doses_past_week: number;
    has_severe_symptoms: boolean;
  };
  image_url: string;
}

export interface SubmitAdjudicationDTO {
  decision: AdjudicationDecision;
  clinical_notes: string;
  rejection_reason_category?: RejectionReasonCategory;
}

export interface ApiErrorResponse {
  detail?: string;
  status?: number;
}
