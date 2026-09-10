import { type QueueItem } from '../types/adjudication.types';

export function sortAdjudicationQueue(items: QueueItem[]): QueueItem[] {
  return [...items].sort((a, b) => {
    // 1. Sort by Priority (RED first)
    if (a.triage_color === 'RED' && b.triage_color !== 'RED') return -1;
    if (b.triage_color === 'RED' && a.triage_color !== 'RED') return 1;

    // 2. Sort by FIFO (submitted_at ASC) within the same priority
    const timeA = new Date(a.submitted_at).getTime();
    const timeB = new Date(b.submitted_at).getTime();
    
    return timeA - timeB;
  });
}
