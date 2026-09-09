import React from 'react';

interface OcrConfidenceGaugeProps {
  confidence: number;
}

export const OcrConfidenceGauge: React.FC<OcrConfidenceGaugeProps> = ({ confidence }) => {
  const threshold = 0.85;
  const isPassing = confidence >= threshold;
  
  // Calculate percentage for progress bar
  const percentage = Math.min(Math.max(confidence * 100, 0), 100);
  const thresholdPercentage = threshold * 100;

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">OCR Extraction Confidence</h3>
        <span className={`text-sm font-semibold px-2 py-1 rounded ${isPassing ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          {(confidence * 100).toFixed(2)}%
        </span>
      </div>
      
      <div className="relative pt-1">
        <div className="flex mb-2 items-center justify-between">
          <div>
            <span className="text-xs font-semibold inline-block text-gray-500">0%</span>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold inline-block text-gray-500">100%</span>
          </div>
        </div>
        
        {/* Progress Bar Container */}
        <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-gray-200 relative">
          {/* Threshold Marker */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" 
            style={{ left: `${thresholdPercentage}%` }}
            title="0.85 Threshold"
          />
          {/* Actual Progress */}
          <div 
            style={{ width: `${percentage}%` }} 
            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${isPassing ? 'bg-green-500' : 'bg-yellow-500'}`}
          />
        </div>
        <div className="text-xs text-gray-500 text-center">
          Critical cutoff line at 85%
        </div>
      </div>
    </div>
  );
};
