import { VoucherEntity } from '../types/voucher-worker.types';

// Mock DB interface for the worker
export interface DatabaseConnection {
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<void>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export class VoucherWorkerRepository {
  constructor(private db: DatabaseConnection) {}

  /**
   * Fetches candidate vouchers that are ACTIVE and expired,
   * acquiring a pessimistic row lock and skipping already locked rows.
   */
  async getExpiredCandidates(batchSize: number, now: Date): Promise<VoucherEntity[]> {
    const sql = `
      SELECT id, refill_request_id, voucher_code, status, expires_at 
      FROM pharmacy_vouchers 
      WHERE status = 'ACTIVE' 
        AND expires_at < $1
      ORDER BY expires_at ASC
      LIMIT $2
      FOR UPDATE SKIP LOCKED;
    `;
    return this.db.query<VoucherEntity>(sql, [now.toISOString(), batchSize]);
  }

  /**
   * Transitions the specified vouchers to EXPIRED status.
   */
  async markAsExpired(voucherIds: string[]): Promise<void> {
    if (voucherIds.length === 0) return;
    
    // Create parameterized placeholders, e.g., $1, $2, $3
    const placeholders = voucherIds.map((_, i) => `$${i + 1}`).join(',');
    const sql = `
      UPDATE pharmacy_vouchers 
      SET status = 'EXPIRED' 
      WHERE id IN (${placeholders}) 
        AND status = 'ACTIVE';
    `;
    await this.db.execute(sql, voucherIds);
  }
}
