import React from 'react';
import { type FilterState } from '../hooks/useAdjudicationQueue';

interface QueueFilterToolbarProps {
  currentFilter: FilterState;
  onFilterChange: (filter: FilterState) => void;
}

export const QueueFilterToolbar: React.FC<QueueFilterToolbarProps> = ({ currentFilter, onFilterChange }) => {
  return (
    <div className="flex space-x-2 mb-4 bg-white p-2 rounded-lg shadow-sm border border-gray-100">
      <button
        onClick={() => onFilterChange('ALL')}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          currentFilter === 'ALL' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        All Flagged
      </button>
      <button
        onClick={() => onFilterChange('RED')}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          currentFilter === 'RED' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
        }`}
      >
        Red Only (High Priority)
      </button>
      <button
        onClick={() => onFilterChange('YELLOW')}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          currentFilter === 'YELLOW' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
        }`}
      >
        Yellow Only
      </button>
    </div>
  );
};
