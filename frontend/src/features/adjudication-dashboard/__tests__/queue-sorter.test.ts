import { describe, it, expect } from 'vitest';
import { sortAdjudicationQueue } from '../utils/queue-sorter';
import { QueueItem } from '../types/adjudication.types';

describe('queue-sorter', () => {
  it('sorts RED before YELLOW and by FIFO', () => {
    const items: QueueItem[] = [
      { id: '1', triage_color: 'YELLOW', submitted_at: '2026-09-01T10:00:00Z', refill_request_id: '', patient_name: '', national_id: '', anomaly_reason: '' },
      { id: '2', triage_color: 'RED', submitted_at: '2026-09-01T12:00:00Z', refill_request_id: '', patient_name: '', national_id: '', anomaly_reason: '' },
      { id: '3', triage_color: 'RED', submitted_at: '2026-09-01T09:00:00Z', refill_request_id: '', patient_name: '', national_id: '', anomaly_reason: '' }
    ];

    const sorted = sortAdjudicationQueue(items);
    
    // RED 09:00, RED 12:00, YELLOW 10:00
    expect(sorted[0].id).toBe('3');
    expect(sorted[1].id).toBe('2');
    expect(sorted[2].id).toBe('1');
  });
});
