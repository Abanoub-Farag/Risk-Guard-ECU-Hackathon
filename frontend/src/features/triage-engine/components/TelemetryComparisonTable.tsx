import React from 'react';
import { OcrResult } from '../types/triage.types';

interface TelemetryComparisonTableProps {
  currentMetrics: OcrResult;
  priorMetrics: OcrResult;
}

export const TelemetryComparisonTable: React.FC<TelemetryComparisonTableProps> = ({ currentMetrics, priorMetrics }) => {
  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg bg-white mt-6">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Metric</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Current Reading</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Prior Reading</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          <tr>
            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">Systolic (mmHg)</td>
            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{currentMetrics.systolic}</td>
            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{priorMetrics.systolic}</td>
            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
              {currentMetrics.systolic === priorMetrics.systolic ? (
                <span className="inline-flex rounded-full bg-red-100 px-2 text-xs font-semibold leading-5 text-red-800">Identical</span>
              ) : 'Changed'}
            </td>
          </tr>
          <tr>
            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">Diastolic (mmHg)</td>
            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{currentMetrics.diastolic}</td>
            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{priorMetrics.diastolic}</td>
            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
              {currentMetrics.diastolic === priorMetrics.diastolic ? (
                <span className="inline-flex rounded-full bg-red-100 px-2 text-xs font-semibold leading-5 text-red-800">Identical</span>
              ) : 'Changed'}
            </td>
          </tr>
          <tr>
            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">Glucose (mg/dL)</td>
            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{currentMetrics.glucose}</td>
            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{priorMetrics.glucose}</td>
            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
              {currentMetrics.glucose === priorMetrics.glucose ? (
                <span className="inline-flex rounded-full bg-red-100 px-2 text-xs font-semibold leading-5 text-red-800">Identical</span>
              ) : 'Changed'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
