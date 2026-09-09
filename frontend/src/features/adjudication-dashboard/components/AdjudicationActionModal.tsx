import React, { useState } from 'react';
import { AdjudicationDecision, RejectionReasonCategory, SubmitAdjudicationDTO } from '../types/adjudication.types';
import { validateAdjudicationAction } from '../utils/adjudication.validator';

interface AdjudicationActionModalProps {
  decision: AdjudicationDecision;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: SubmitAdjudicationDTO) => Promise<void>;
  isSubmitting: boolean;
}

export const AdjudicationActionModal: React.FC<AdjudicationActionModalProps> = ({ 
  decision, isOpen, onClose, onSubmit, isSubmitting 
}) => {
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<RejectionReasonCategory | ''>('');
  const [validationErrors, setValidationErrors] = useState<{ clinical_notes?: string; rejection_reason_category?: string }>({});

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const catOrUndefined = category === '' ? undefined : category;
    const { isValid, errors } = validateAdjudicationAction(decision, notes, catOrUndefined);
    
    if (!isValid) {
      setValidationErrors(errors);
      return;
    }

    try {
      await onSubmit({
        decision,
        clinical_notes: notes,
        rejection_reason_category: catOrUndefined
      });
      onClose();
    } catch (err) {
      // Parent handles top-level API error alerts
    }
  };

  const isApprove = decision === 'APPROVE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden modal-overlay p-4">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl p-6">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close modal"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className={`text-xl font-bold mb-6 ${isApprove ? 'text-green-700' : 'text-red-700'}`}>
          {isApprove ? 'Approve Claim Clearance' : 'Reject Claim & Escalate'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isApprove && (
            <div>
              <label htmlFor="rejectionCategory" className="block text-sm font-medium text-gray-700 mb-1">
                Rejection Reason Category <span className="text-red-500">*</span>
              </label>
              <select
                id="rejectionCategory"
                value={category}
                onChange={e => {
                  setCategory(e.target.value as RejectionReasonCategory);
                  setValidationErrors(prev => ({ ...prev, rejection_reason_category: undefined }));
                }}
                className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none sm:text-sm rounded-md border ${
                  validationErrors.rejection_reason_category ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-blue-500 focus:border-blue-500'
                }`}
              >
                <option value="" disabled>Select a category...</option>
                <option value="FRAUD_DATA_FABRICATION">Fraud / Data Fabrication</option>
                <option value="UNREADABLE_IMAGE">Unreadable Image</option>
                <option value="CLINICALLY_UNSAFE_READING">Clinically Unsafe Reading</option>
                <option value="IDENTITY_MISMATCH">Identity Mismatch</option>
              </select>
              {validationErrors.rejection_reason_category && (
                <p className="mt-2 text-sm text-red-600">{validationErrors.rejection_reason_category}</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="clinicalNotes" className="block text-sm font-medium text-gray-700 mb-1">
              Clinical Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              id="clinicalNotes"
              rows={4}
              value={notes}
              onChange={e => {
                setNotes(e.target.value);
                setValidationErrors(prev => ({ ...prev, clinical_notes: undefined }));
              }}
              placeholder="Enter minimum 10 characters justifying this decision..."
              className={`block w-full border-gray-300 rounded-md shadow-sm sm:text-sm p-3 border ${
                validationErrors.clinical_notes ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
            {validationErrors.clinical_notes && (
              <p className="mt-2 text-sm text-red-600">{validationErrors.clinical_notes}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none ${
                isApprove ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'Submitting...' : isApprove ? 'Confirm Approval' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
