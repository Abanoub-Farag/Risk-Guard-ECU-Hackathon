import React from 'react';
import { ClaimDetailResponse } from '../types/adjudication.types';

interface HistoricalComparisonCardProps {
  currentMetrics: ClaimDetailResponse['extracted_metrics'];
  priorMetrics: ClaimDetailResponse['prior_metrics'];
}

export const HistoricalComparisonCard: React.FC<HistoricalComparisonCardProps> = ({ currentMetrics, priorMetrics }) => {
  if (!priorMetrics) return null;

  const isExactMatch = 
    currentMetrics.systolic === priorMetrics.systolic &&
    currentMetrics.diastolic === priorMetrics.diastolic &&
    currentMetrics.glucose === priorMetrics.glucose;

  if (!isExactMatch) return null;

  return (
    <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-600 shadow-sm mt-4">
      <h4 className="text-sm font-bold text-red-800 uppercase tracking-wide flex items-center">
        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Potential Data Fabrication
      </h4>
      <p className="mt-2 text-sm text-red-700">
        The extracted readings exactly match the patient's prior cycle metrics. 
        Please carefully inspect the image for signs of reuse or digital alteration.
      </p>
    </div>
  );
};
