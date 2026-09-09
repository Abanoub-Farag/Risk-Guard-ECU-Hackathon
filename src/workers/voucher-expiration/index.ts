import { VoucherSweeperJob } from './scheduler/voucher-sweeper.job';
import { VoucherSweeperService } from './services/voucher-sweeper.service';
import { VoucherWorkerRepository, DatabaseConnection } from './repositories/voucher-worker.repo';

// Mock DB connection for bootstrapping
const mockDb: DatabaseConnection = {
  query: async () => [],
  execute: async () => {},
  beginTransaction: async () => {},
  commit: async () => {},
  rollback: async () => {}
};

const repo = new VoucherWorkerRepository(mockDb);
const service = new VoucherSweeperService(repo, mockDb);
const job = new VoucherSweeperJob(service);

// Graceful shutdown listeners
process.on('SIGINT', () => {
  job.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  job.stop();
  process.exit(0);
});

// Start the worker if this file is executed directly
if (require.main === module) {
  job.start();
}

export { job, service, repo };
