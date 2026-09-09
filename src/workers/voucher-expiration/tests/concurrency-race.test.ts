import { VoucherSweeperService } from '../services/voucher-sweeper.service';
import { VoucherWorkerRepository, DatabaseConnection } from '../repositories/voucher-worker.repo';
import { VoucherEntity } from '../types/voucher-worker.types';

describe('Concurrency Integration: Worker Sweep vs POS Redemption', () => {
  let mockDb: jest.Mocked<DatabaseConnection>;
  let repo: VoucherWorkerRepository;
  let service: VoucherSweeperService;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      execute: jest.fn(),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    } as any;
    repo = new VoucherWorkerRepository(mockDb);
    service = new VoucherSweeperService(repo, mockDb);
  });

  it('safely skips vouchers locked by a concurrent POS redemption', async () => {
    // Simulate SKIP LOCKED behavior: if a voucher is currently locked by 
    // a POS redemption transaction, the sweeper's query returns an empty set.
    mockDb.query.mockResolvedValue([]);
    
    const metrics = await service.executeSweep(500, new Date());
    
    // Asserts that no state transitions occurred during the sweep because the 
    // voucher was locked by another transaction
    expect(metrics.totalExamined).toBe(0);
    expect(metrics.totalExpired).toBe(0);
    expect(mockDb.execute).not.toHaveBeenCalled();
    expect(mockDb.commit).toHaveBeenCalled();
  });

  it('prevents POS redemption if worker sweep locks and transitions it first', async () => {
    const expiredVoucher: VoucherEntity = {
      id: 'v2',
      refill_request_id: 'r2',
      voucher_code: 'CODE2',
      status: 'ACTIVE',
      expires_at: new Date(Date.now() - 1000)
    };
    
    // The sweeper acquires the lock first and returns the voucher
    mockDb.query.mockResolvedValue([expiredVoucher]);
    
    const metrics = await service.executeSweep(500, new Date());
    
    // Asserts that the sweeper successfully marked it EXPIRED.
    // If the POS endpoint subsequently tries to select this voucher, 
    // its status will no longer be 'ACTIVE' and it will throw a 422 Expired error.
    expect(metrics.totalExamined).toBe(1);
    expect(metrics.totalExpired).toBe(1);
    expect(mockDb.execute).toHaveBeenCalledWith(expect.any(String), ['v2']);
  });
});
