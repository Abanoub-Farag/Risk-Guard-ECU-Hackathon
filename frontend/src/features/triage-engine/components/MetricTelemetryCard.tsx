import React from 'react';

interface MetricTelemetryCardProps {
  label: string;
  value: number;
  unit: string;
}

export const MetricTelemetryCard: React.FC<MetricTelemetryCardProps> = ({ label, value, unit }) => {
  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col justify-between border border-gray-100">
      <span className="text-sm text-gray-500 uppercase tracking-wide">{label}</span>
      <div className="mt-2 flex items-baseline">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        <span className="ml-1 text-sm font-medium text-gray-500">{unit}</span>
      </div>
    </div>
  );
};
