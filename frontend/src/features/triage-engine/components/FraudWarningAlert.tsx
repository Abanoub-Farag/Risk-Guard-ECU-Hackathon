import React from 'react';

export const FraudWarningAlert: React.FC = () => {
  return (
    <div 
      className="bg-red-50 border-l-4 border-red-600 p-4 rounded shadow-sm"
      role="alert" 
      aria-live="polite"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-bold text-red-800 uppercase tracking-wide">
            CRITICAL: Suspected Data Fabrication
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>
              The extracted telemetry data exactly matches a prior cycle's historical OCR results. 
              This scan has been flagged as a potential duplicate or fabricated submission.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
