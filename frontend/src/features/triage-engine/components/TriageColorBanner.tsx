import React from 'react';
import { TriageColor, AnomalyReason } from '../types/triage.types';
import { formatAnomalyReason } from '../utils/triage-formatter';

interface TriageColorBannerProps {
  color: TriageColor;
  anomalyReason: AnomalyReason;
}

export const TriageColorBanner: React.FC<TriageColorBannerProps> = ({ color, anomalyReason }) => {
  const getBannerStyles = () => {
    switch (color) {
      case 'GREEN':
        return 'bg-emerald-100 border-emerald-500 text-emerald-900';
      case 'YELLOW':
        return 'bg-amber-100 border-amber-500 text-amber-900';
      case 'RED':
        return 'bg-red-100 border-red-600 text-red-900';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-900';
    }
  };

  const statusText = color === 'GREEN' 
    ? 'Automated Clinical Clearance - Approved' 
    : color === 'RED'
      ? 'Clinical Anomaly Detected - Escalated to Medical Staff'
      : formatAnomalyReason(anomalyReason);

  return (
    <div 
      className={`border-l-4 p-4 rounded shadow-sm ${getBannerStyles()}`}
      role="alert" 
      aria-live="polite"
    >
      <div className="flex">
        <div className="ml-3">
          <h2 className="text-lg font-bold uppercase tracking-wide">
            {statusText}
          </h2>
          {color !== 'GREEN' && (
            <p className="mt-1 text-sm opacity-90">
              Reason: {formatAnomalyReason(anomalyReason)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
