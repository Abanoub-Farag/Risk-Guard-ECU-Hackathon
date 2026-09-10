import React from 'react';
import { Link } from 'react-router-dom';
import { type QueueItem } from '../types/adjudication.types';

interface QueueRowProps {
  item: QueueItem;
}

export const QueueRow: React.FC<QueueRowProps> = ({ item }) => {
  // Format wait time simply for demo
  const waitMinutes = Math.floor((new Date().getTime() - new Date(item.submitted_at).getTime()) / 60000);
  const waitText = waitMinutes > 60 ? `${Math.floor(waitMinutes/60)}h ${waitMinutes%60}m` : `${Math.max(0, waitMinutes)}m`;

  const isRed = item.triage_color === 'RED';

  return (
    <tr className={isRed ? 'bg-red-50/30' : 'bg-yellow-50/20'}>
      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
          isRed ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {item.triage_color}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
        {item.patient_name}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
        {item.national_id}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
        {item.anomaly_reason.replace(/_/g, ' ')}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
        {waitText}
      </td>
      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
        <Link 
          to={`/adjudication/claims/${item.id}`} 
          className="text-blue-600 hover:text-blue-900"
        >
          Inspect Claim<span className="sr-only">, {item.patient_name}</span>
        </Link>
      </td>
    </tr>
  );
};
