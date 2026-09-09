import { WorkerConfigOptions } from '../types/voucher-worker.types';

export const workerConfig: WorkerConfigOptions = {
  // Run every 5 minutes
  cronSchedule: '*/5 * * * *',
  // Process up to 500 records per sweep to prevent lock escalation
  batchSize: 500,
  lockTimeoutMs: 10000,
  maxRetries: 3
};
