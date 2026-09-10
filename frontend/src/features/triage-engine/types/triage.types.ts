export type TriageColor = 'GREEN' | 'YELLOW' | 'RED';

export const AnomalyReason = {
  LOW_OCR_CONFIDENCE: 'LOW_OCR_CONFIDENCE',
  PHYSIOLOGICAL_IMPOSSIBILITY: 'PHYSIOLOGICAL_IMPOSSIBILITY',
  SUSPECTED_DATA_FABRICATION: 'SUSPECTED_DATA_FABRICATION',
  CLINICAL_VARIANCE_EXCEEDED: 'CLINICAL_VARIANCE_EXCEEDED',
  NONE: 'NONE'
} as const;

export type AnomalyReason = typeof AnomalyReason[keyof typeof AnomalyReason];

export interface OcrResult {
  systolic: number;
  diastolic: number;
  glucose: number;
  confidence_score: number;
}

export interface ProcessOcrDTO {
  image_url?: string;
  file_id?: string;
}

export interface TriageRecord {
  id: string;
  refill_request_id: string;
  triage_color: TriageColor;
  anomaly_reason: AnomalyReason;
  extracted_metrics: OcrResult;
  prior_metrics?: OcrResult;
  created_at: string;
}

export interface TriageSummaryResponse {
  triage_record: TriageRecord;
  message?: string;
}
