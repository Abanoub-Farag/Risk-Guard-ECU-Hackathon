export interface SweepMetrics {
  totalExamined: number;
  totalExpired: number;
  durationMs: number;
  retries: number;
}

export interface WorkerConfigOptions {
  cronSchedule: string;
  batchSize: number;
  lockTimeoutMs: number;
  maxRetries: number;
}

export interface VoucherEntity {
  id: string;
  refill_request_id: string;
  voucher_code: string;
  status: string;
  expires_at: Date;
}
