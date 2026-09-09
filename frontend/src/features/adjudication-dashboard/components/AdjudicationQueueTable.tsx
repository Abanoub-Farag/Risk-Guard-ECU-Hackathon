import React from 'react';
import { QueueItem } from '../types/adjudication.types';
import { QueueRow } from './QueueRow';

interface AdjudicationQueueTableProps {
  items: QueueItem[];
}

export const AdjudicationQueueTable: React.FC<AdjudicationQueueTableProps> = ({ items }) => {
  if (items.length === 0) {
    return (
      <div className="bg-white p-8 text-center text-gray-500 rounded-lg border border-gray-200 shadow-sm">
        No flagged claims in the queue.
      </div>
    );
  }

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg bg-white">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Priority</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Patient</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">National ID</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Anomaly Reason</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Wait Time</th>
            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
              <span className="sr-only">Inspect Claim</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map(item => (
            <QueueRow key={item.id} item={item} />
          ))}
        </tbody>
      </table>
    </div>
  );
};
