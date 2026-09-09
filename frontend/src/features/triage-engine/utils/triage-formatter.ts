import { AnomalyReason } from '../types/triage.types';

export function formatAnomalyReason(reason: AnomalyReason): string {
  switch (reason) {
    case AnomalyReason.LOW_OCR_CONFIDENCE:
      return 'Low Extraction Confidence';
    case AnomalyReason.PHYSIOLOGICAL_IMPOSSIBILITY:
      return 'Physiological Impossibility Detected';
    case AnomalyReason.SUSPECTED_DATA_FABRICATION:
      return 'Suspected Data Fabrication';
    case AnomalyReason.CLINICAL_VARIANCE_EXCEEDED:
      return 'Baseline Variance Exceeded';
    case AnomalyReason.NONE:
      return 'Automated Clinical Clearance - Approved';
    default:
      return 'Unknown Anomaly';
  }
}
