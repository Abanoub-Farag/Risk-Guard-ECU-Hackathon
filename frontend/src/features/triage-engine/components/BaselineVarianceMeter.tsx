import React from 'react';
import { calculateVariancePercentage, isVarianceAcceptable } from '../utils/variance-calculator';

interface BaselineVarianceMeterProps {
  label: string;
  extractedValue: number;
  baselineValue: number;
}

export const BaselineVarianceMeter: React.FC<BaselineVarianceMeterProps> = ({ label, extractedValue, baselineValue }) => {
  const variance = calculateVariancePercentage(extractedValue, baselineValue);
  const isAcceptable = isVarianceAcceptable(variance, 20);
  
  return (
    <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-600">{label} Variance</span>
        <span className={`text-sm font-bold ${isAcceptable ? 'text-green-600' : 'text-red-600'}`}>
          {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
        </span>
      </div>
      
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>Extracted: <strong>{extractedValue}</strong></span>
        <span>Baseline: <strong>{baselineValue}</strong></span>
      </div>
      
      {!isAcceptable && (
        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
          Exceeds ±20% tolerance boundary.
        </div>
      )}
    </div>
  );
};
