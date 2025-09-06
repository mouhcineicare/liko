import cron from 'node-cron';
import { processPayouts, sendPayoutReport } from '@/lib/services/payoutProcessor';

// Configuration with type safety
interface PayoutConfig {
  schedule: string;
  timezone: string;
  maxAttempts: number;
}

const PAYOUT_CONFIG: PayoutConfig = {
  schedule: '0 22 * * *', // 10:00 PM UTC (2 AM Dubai time)
  timezone: 'Asia/Dubai',
  maxAttempts: 3
};

// Singleton pattern for cron job management
class PayoutScheduler {
  private static instance: PayoutScheduler;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

  private constructor() {}

  public static getInstance(): PayoutScheduler {
    if (!PayoutScheduler.instance) {
      PayoutScheduler.instance = new PayoutScheduler();
    }
    return PayoutScheduler.instance;
  }

  public async runScheduledPayouts(): Promise<{
    successCount: number;
    failureCount: number;
  }> {
    if (this.isRunning) {
      console.warn('[Payout] Payouts already in progress');
      return { successCount: 0, failureCount: 0 };
    }

    this.isRunning = true;
    const startTime = new Date();
    console.log(`[Payout] Starting scheduled payouts at ${startTime.toISOString()}`);

    try {
      const result = await processPayouts();
      console.log(`[Payout] Completed: ${result.successCount} succeeded, ${result.failureCount} failed`);
      
      await sendPayoutReport({
        ...result,
        type: 'scheduled',
        startTime,
        endTime: new Date()
      });

      return result;
    } catch (error) {
      console.error('[Payout] Scheduled job failed:', error);
      await sendPayoutReport({
        successCount: 0,
        failureCount: 0,
        totalProcessed: 0,
        type: 'scheduled',
        error: error instanceof Error ? error.message : 'Unknown error',
        startTime,
        endTime: new Date()
      });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  public initPayoutCron(): void {
    if (this.cronJob) {
      console.warn('[Payout] Cron job already initialized');
      return;
    }

    this.cronJob = cron.schedule(
      PAYOUT_CONFIG.schedule,
      () => {
        this.runScheduledPayouts().catch(console.error);
      },
      {
        timezone: PAYOUT_CONFIG.timezone,
        scheduled: true, //process.env.NODE_ENV === 'production'
      }
    );

    console.log(`[Payout] Cron job initialized for ${PAYOUT_CONFIG.schedule} (${PAYOUT_CONFIG.timezone})`);

    // Cleanup on process exit
    process.on('SIGTERM', this.shutdown.bind(this));
    process.on('SIGINT', this.shutdown.bind(this));
  }

  public async manualPayoutTrigger() {
    console.log('[Payout] Manual payout triggered');
    return this.runScheduledPayouts();
  }

  private shutdown() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('[Payout] Cron job stopped gracefully');
    }
  }
}

// Export singleton instance methods
const payoutScheduler = PayoutScheduler.getInstance();
export const initPayoutCron = () => payoutScheduler.initPayoutCron();
export const manualPayoutTrigger = () => payoutScheduler.manualPayoutTrigger();
export const runScheduledPayouts = () => payoutScheduler.runScheduledPayouts();