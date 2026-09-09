import { DatabaseConnection, VoucherWorkerRepository } from '../repositories/voucher-worker.repo';
import { SweepMetrics } from '../types/voucher-worker.types';

export class VoucherSweeperService {
  constructor(
    private repo: VoucherWorkerRepository,
    private db: DatabaseConnection
  ) {}

  /**
   * Performs an atomic sweep to expire vouchers.
   * Leverages pessimistic locking to avoid POS redemption race conditions.
   */
  async executeSweep(batchSize: number, now: Date = new Date()): Promise<SweepMetrics> {
    const startTime = Date.now();
    let totalExamined = 0;
    let totalExpired = 0;
    let retries = 0;

    try {
      await this.db.beginTransaction();

      // 1. Fetch candidates with FOR UPDATE SKIP LOCKED
      // This will immediately return rows that are NOT locked by concurrent POS transactions
      const candidates = await this.repo.getExpiredCandidates(batchSize, now);
      totalExamined = candidates.length;

      if (totalExamined > 0) {
        const voucherIds = candidates.map(v => v.id);
        
        // 2. Mark as expired within the same transaction
        await this.repo.markAsExpired(voucherIds);
        totalExpired = voucherIds.length;
      }

      await this.db.commit();
    } catch (error) {
      await this.db.rollback();
      retries++;
      // In a robust implementation, you might retry transient errors here.
      throw error;
    }

    return {
      totalExamined,
      totalExpired,
      durationMs: Date.now() - startTime,
      retries
    };
  }
}
