import { useState, useEffect } from 'react';
import { type QueueItem, type TriageColor } from '../types/adjudication.types';
import { fetchQueueItems } from '../services/adjudication.api';
import { sortAdjudicationQueue } from '../utils/queue-sorter';

export type FilterState = 'ALL' | TriageColor;

export function useAdjudicationQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [filter, setFilter] = useState<FilterState>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = async () => {
    try {
      setIsLoading(true);
      const data = await fetchQueueItems();
      setItems(data);
    } catch (err: any) {
      setError(err.message || 'Error loading queue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const filteredItems = items.filter(item => {
    if (filter === 'ALL') return true;
    return item.triage_color === filter;
  });

  const sortedItems = sortAdjudicationQueue(filteredItems);

  return { items: sortedItems, filter, setFilter, isLoading, error, reload: loadQueue };
}
