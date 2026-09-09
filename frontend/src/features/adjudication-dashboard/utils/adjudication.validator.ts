import { AdjudicationDecision, RejectionReasonCategory } from '../types/adjudication.types';

export interface AdjudicationValidationResult {
  isValid: boolean;
  errors: {
    clinical_notes?: string;
    rejection_reason_category?: string;
  };
}

export function validateAdjudicationAction(
  decision: AdjudicationDecision,
  clinicalNotes: string,
  rejectionCategory?: RejectionReasonCategory
): AdjudicationValidationResult {
  const errors: AdjudicationValidationResult['errors'] = {};
  
  if (!clinicalNotes || clinicalNotes.trim().length < 10) {
    errors.clinical_notes = 'Clinical notes must be at least 10 characters long.';
  }

  if (decision === 'REJECT' && !rejectionCategory) {
    errors.rejection_reason_category = 'Rejection reason category is strictly mandatory for rejections.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
