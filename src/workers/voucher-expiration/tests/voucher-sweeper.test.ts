import { VoucherSweeperService } from '../services/voucher-sweeper.service';
import { VoucherWorkerRepository, DatabaseConnection } from '../repositories/voucher-worker.repo';
import { VoucherEntity } from '../types/voucher-worker.types';

describe('VoucherSweeperService Unit Tests', () => {
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

  it('ignores vouchers where expires_at is in the future', async () => {
    // DB returns empty when asked for expired vouchers
    mockDb.query.mockResolvedValue([]);
    
    const metrics = await service.executeSweep(500, new Date());
    
    expect(metrics.totalExamined).toBe(0);
    expect(metrics.totalExpired).toBe(0);
    expect(mockDb.execute).not.toHaveBeenCalled();
    expect(mockDb.commit).toHaveBeenCalled();
  });

  it('marks vouchers as EXPIRED if expires_at precedes current timestamp', async () => {
    const expiredVoucher: VoucherEntity = {
      id: 'v1',
      refill_request_id: 'r1',
      voucher_code: 'CODE',
      status: 'ACTIVE',
      expires_at: new Date(Date.now() - 10000)
    };
    mockDb.query.mockResolvedValue([expiredVoucher]);
    
    const metrics = await service.executeSweep(500, new Date());
    
    expect(metrics.totalExamined).toBe(1);
    expect(metrics.totalExpired).toBe(1);
    expect(mockDb.execute).toHaveBeenCalledWith(expect.any(String), ['v1']);
    expect(mockDb.commit).toHaveBeenCalled();
  });

  it('rolls back transaction on DB error', async () => {
    mockDb.query.mockRejectedValue(new Error('DB connection failed'));
    
    await expect(service.executeSweep(500)).rejects.toThrow('DB connection failed');
    expect(mockDb.rollback).toHaveBeenCalled();
  });
});
