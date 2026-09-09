import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useClaimInspection } from '../hooks/useClaimInspection';
import { useAdjudicationAction } from '../hooks/useAdjudicationAction';
import { DeviceScanImageViewer } from '../components/DeviceScanImageViewer';
import { ClaimTelemetryPanel } from '../components/ClaimTelemetryPanel';
import { HistoricalComparisonCard } from '../components/HistoricalComparisonCard';
import { AdjudicationActionModal } from '../components/AdjudicationActionModal';
import { AdjudicationDecision, SubmitAdjudicationDTO } from '../types/adjudication.types';
import '../styles/adjudication.css';

export const ClaimReviewDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { claim, isLoading, error: fetchError } = useClaimInspection(id || '');
  const { executeAction, isSubmitting, error: actionError } = useAdjudicationAction(id || '');
  
  const [modalState, setModalState] = useState<{ isOpen: boolean; decision: AdjudicationDecision }>({
    isOpen: false,
    decision: 'APPROVE'
  });

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading workspace...</div>;
  if (fetchError || !claim) return <div className="p-8 text-center text-red-500">Error loading claim details.</div>;

  const handleSubmit = async (payload: SubmitAdjudicationDTO) => {
    await executeAction(payload);
    // On success, redirect back to queue
    navigate('/adjudication/queue');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10 shadow-sm">
        <div className="flex items-center space-x-4">
          <Link to="/adjudication/queue" className="text-gray-500 hover:text-gray-700">
            &larr; Back to Queue
          </Link>
          <div className="h-6 w-px bg-gray-300"></div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{claim.patient_name}</h1>
            <p className="text-sm text-gray-500">ID: {claim.national_id}</p>
          </div>
          <span className={`ml-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
            claim.triage_color === 'RED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {claim.triage_color} PRIORITY
          </span>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setModalState({ isOpen: true, decision: 'REJECT' })}
            className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-md font-medium hover:bg-red-100 transition-colors"
          >
            Reject Claim
          </button>
          <button 
            onClick={() => setModalState({ isOpen: true, decision: 'APPROVE' })}
            className="px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors shadow-sm"
          >
            Approve Claim
          </button>
        </div>
      </header>

      {/* Action Error Banner */}
      {actionError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 shrink-0 shadow-sm z-20">
          <p className="text-sm text-red-700 font-medium">{actionError}</p>
        </div>
      )}

      {/* Split Workspace */}
      <div className="adjudication-split-pane flex-1">
        <DeviceScanImageViewer imageUrl={claim.image_url} />
        
        <div className="adjudication-right-pane p-6 space-y-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">Flag Reason</h3>
            <p className="text-gray-700">{claim.anomaly_reason.replace(/_/g, ' ')}</p>
          </div>

          <ClaimTelemetryPanel 
            metrics={claim.extracted_metrics} 
            priorMetrics={claim.prior_metrics} 
          />
          
          <HistoricalComparisonCard 
            currentMetrics={claim.extracted_metrics} 
            priorMetrics={claim.prior_metrics} 
          />

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reported Questionnaire</h3>
            <div className="space-y-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-sm text-gray-500">Missed doses past week</span>
                <span className="text-sm font-medium text-gray-900">{claim.questionnaire.missed_doses_past_week}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-sm text-gray-500">Severe symptoms</span>
                <span className={`text-sm font-medium ${claim.questionnaire.has_severe_symptoms ? 'text-red-600' : 'text-green-600'}`}>
                  {claim.questionnaire.has_severe_symptoms ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AdjudicationActionModal 
        isOpen={modalState.isOpen}
        decision={modalState.decision}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};
