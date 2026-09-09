import { VoucherSweeperService } from '../services/voucher-sweeper.service';
import { workerConfig } from '../config/worker.config';

export class VoucherSweeperJob {
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  constructor(private sweeperService: VoucherSweeperService) {}

  public start() {
    console.log(`Starting VoucherSweeperJob with cron schedule: ${workerConfig.cronSchedule}`);
    
    // Simplistic cron interval mapping for demonstration.
    // In production, you'd use node-cron or Agenda.
    const intervalMs = 5 * 60 * 1000; // 5 minutes

    this.intervalId = setInterval(async () => {
      await this.run();
    }, intervalMs);

    // Initial run
    this.run();
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    console.log('VoucherSweeperJob stopped gracefully.');
  }

  private async run() {
    if (this.isRunning) {
      console.warn('Sweep job is already running. Skipping this cycle to prevent overlap.');
      return;
    }

    this.isRunning = true;
    try {
      const metrics = await this.sweeperService.executeSweep(workerConfig.batchSize);
      console.log(`Sweep completed: Examined=${metrics.totalExamined}, Expired=${metrics.totalExpired}, Duration=${metrics.durationMs}ms`);
    } catch (error) {
      console.error('Error during voucher sweep execution:', error);
    } finally {
      this.isRunning = false;
    }
  }
}
