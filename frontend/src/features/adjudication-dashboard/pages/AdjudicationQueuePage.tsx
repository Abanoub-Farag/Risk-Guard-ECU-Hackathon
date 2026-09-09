import React from 'react';
import { useAdjudicationQueue } from '../hooks/useAdjudicationQueue';
import { QueueFilterToolbar } from '../components/QueueFilterToolbar';
import { AdjudicationQueueTable } from '../components/AdjudicationQueueTable';
import '../styles/adjudication.css';

export const AdjudicationQueuePage: React.FC = () => {
  const { items, filter, setFilter, isLoading, error } = useAdjudicationQueue();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clinician Exception Queue</h1>
          <p className="mt-2 text-sm text-gray-700">
            Review and adjudicate flagged prescription refill claims requiring human intervention.
          </p>
        </div>
      </div>

      <QueueFilterToolbar currentFilter={filter} onFilterChange={setFilter} />

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading queue...</div>
      ) : (
        <AdjudicationQueueTable items={items} />
      )}
    </div>
  );
};
