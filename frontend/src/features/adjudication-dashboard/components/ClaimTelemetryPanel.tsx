import React from 'react';
import { ClaimDetailResponse } from '../types/adjudication.types';

interface ClaimTelemetryPanelProps {
  metrics: ClaimDetailResponse['extracted_metrics'];
  priorMetrics?: ClaimDetailResponse['prior_metrics'];
}

export const ClaimTelemetryPanel: React.FC<ClaimTelemetryPanelProps> = ({ metrics, priorMetrics }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Extracted Telemetry vs Baseline</h3>
      <div className="space-y-4">
        {/* Systolic */}
        <div className="flex justify-between items-center border-b pb-2">
          <span className="text-sm font-medium text-gray-500 w-1/3">Systolic</span>
          <span className="text-lg font-bold text-gray-900 w-1/3 text-center">{metrics.systolic}</span>
          <span className="text-sm text-gray-500 w-1/3 text-right">Baseline: {priorMetrics?.systolic || '--'}</span>
        </div>
        {/* Diastolic */}
        <div className="flex justify-between items-center border-b pb-2">
          <span className="text-sm font-medium text-gray-500 w-1/3">Diastolic</span>
          <span className="text-lg font-bold text-gray-900 w-1/3 text-center">{metrics.diastolic}</span>
          <span className="text-sm text-gray-500 w-1/3 text-right">Baseline: {priorMetrics?.diastolic || '--'}</span>
        </div>
        {/* Glucose */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-500 w-1/3">Glucose</span>
          <span className="text-lg font-bold text-gray-900 w-1/3 text-center">{metrics.glucose}</span>
          <span className="text-sm text-gray-500 w-1/3 text-right">Baseline: {priorMetrics?.glucose || '--'}</span>
        </div>
      </div>
    </div>
  );
};
