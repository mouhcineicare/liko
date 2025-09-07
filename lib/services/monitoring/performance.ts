import { APPOINTMENT_STATUSES } from "@/lib/utils/statusMapping";

export interface PerformanceMetrics {
  transitionLatency: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  throughput: {
    transitionsPerMinute: number;
    transitionsPerHour: number;
    peakHourlyRate: number;
  };
  errorRates: {
    transitionFailures: number;
    historyRecordingFailures: number;
    eventHandlerFailures: number;
    totalErrors: number;
    errorRate: number;
  };
  resourceUsage: {
    memoryUsage: number;
    cpuUsage: number;
    databaseConnections: number;
  };
  systemLoad: {
    activeTransitions: number;
    queuedEvents: number;
    processingTime: number;
  };
}

export interface TransitionTiming {
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private transitionTimings: Map<string, TransitionTiming> = new Map();
  private completedTransitions: TransitionTiming[] = [];
  private errorCounts: Map<string, number> = new Map();
  private hourlyRates: Map<string, number> = new Map();
  private lastCleanup: Date = new Date();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTransition(appointmentId: string): string {
    const timingId = `${appointmentId}_${Date.now()}`;
    const timing: TransitionTiming = {
      startTime: Date.now(),
      status: 'pending'
    };
    
    this.transitionTimings.set(timingId, timing);
    return timingId;
  }

  completeTransition(timingId: string, success: boolean = true, error?: string): void {
    const timing = this.transitionTimings.get(timingId);
    if (!timing) return;

    timing.endTime = Date.now();
    timing.duration = timing.endTime - timing.startTime;
    timing.status = success ? 'completed' : 'failed';
    timing.error = error;

    this.completedTransitions.push(timing);
    this.transitionTimings.delete(timingId);

    // Track hourly rates
    const hour = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const currentRate = this.hourlyRates.get(hour) || 0;
    this.hourlyRates.set(hour, currentRate + 1);

    // Cleanup old data periodically
    this.cleanupOldData();
  }

  recordError(errorType: string): void {
    const currentCount = this.errorCounts.get(errorType) || 0;
    this.errorCounts.set(errorType, currentCount + 1);
  }

  private cleanupOldData(): void {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Keep only recent completed transitions
    this.completedTransitions = this.completedTransitions.filter(
      t => t.startTime > oneHourAgo
    );

    // Clean up old hourly rates (keep last 24 hours)
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString().slice(0, 13);
    for (const [hour] of this.hourlyRates) {
      if (hour < oneDayAgo) {
        this.hourlyRates.delete(hour);
      }
    }

    this.lastCleanup = new Date();
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneMinuteAgo = now - 60 * 1000;

    // Calculate transition latency
    const recentTransitions = this.completedTransitions.filter(
      t => t.startTime > oneHourAgo && t.status === 'completed'
    );

    const latencies = recentTransitions.map(t => t.duration!).sort((a, b) => a - b);
    
    const transitionLatency = {
      average: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      p50: this.percentile(latencies, 50),
      p95: this.percentile(latencies, 95),
      p99: this.percentile(latencies, 99),
      max: latencies.length > 0 ? Math.max(...latencies) : 0
    };

    // Calculate throughput
    const transitionsLastMinute = this.completedTransitions.filter(
      t => t.startTime > oneMinuteAgo
    ).length;

    const transitionsLastHour = this.completedTransitions.filter(
      t => t.startTime > oneHourAgo
    ).length;

    const peakHourlyRate = Math.max(...Array.from(this.hourlyRates.values()));

    const throughput = {
      transitionsPerMinute: transitionsLastMinute,
      transitionsPerHour: transitionsLastHour,
      peakHourlyRate
    };

    // Calculate error rates
    const totalErrors = Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0);
    const totalTransitions = this.completedTransitions.length;
    const errorRate = totalTransitions > 0 ? (totalErrors / totalTransitions) * 100 : 0;

    const errorRates = {
      transitionFailures: this.errorCounts.get('transition_failed') || 0,
      historyRecordingFailures: this.errorCounts.get('history_recording_failed') || 0,
      eventHandlerFailures: this.errorCounts.get('event_handler_failed') || 0,
      totalErrors,
      errorRate
    };

    // Get resource usage (simplified)
    const resourceUsage = {
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      cpuUsage: 0, // Would need external library for CPU monitoring
      databaseConnections: 0 // Would need to track actual DB connections
    };

    // System load
    const systemLoad = {
      activeTransitions: this.transitionTimings.size,
      queuedEvents: 0, // Would need to track event queue
      processingTime: this.completedTransitions.length > 0 ? 
        this.completedTransitions.reduce((sum, t) => sum + (t.duration || 0), 0) / this.completedTransitions.length : 0
    };

    return {
      transitionLatency,
      throughput,
      errorRates,
      resourceUsage,
      systemLoad
    };
  }

  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  async getDetailedReport(): Promise<{
    summary: any;
    trends: any;
    recommendations: string[];
  }> {
    const metrics = await this.getPerformanceMetrics();
    
    const summary = {
      averageLatency: `${metrics.transitionLatency.average.toFixed(2)}ms`,
      errorRate: `${metrics.errorRates.errorRate.toFixed(2)}%`,
      throughput: `${metrics.throughput.transitionsPerHour}/hour`,
      activeTransitions: metrics.systemLoad.activeTransitions,
      memoryUsage: `${metrics.resourceUsage.memoryUsage.toFixed(2)}MB`
    };

    const trends = {
      latencyTrend: this.calculateTrend('latency'),
      errorTrend: this.calculateTrend('errors'),
      throughputTrend: this.calculateTrend('throughput')
    };

    const recommendations = this.generateRecommendations(metrics);

    return { summary, trends, recommendations };
  }

  private calculateTrend(metric: string): 'improving' | 'stable' | 'degrading' {
    // Simplified trend calculation - would need historical data for accurate trends
    return 'stable';
  }

  private generateRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.transitionLatency.p95 > 1000) {
      recommendations.push('High latency detected - consider optimizing database queries');
    }

    if (metrics.errorRates.errorRate > 5) {
      recommendations.push('High error rate - investigate transition failures');
    }

    if (metrics.resourceUsage.memoryUsage > 500) {
      recommendations.push('High memory usage - consider memory optimization');
    }

    if (metrics.throughput.transitionsPerHour < 10) {
      recommendations.push('Low throughput - verify system is being used');
    }

    if (recommendations.length === 0) {
      recommendations.push('System performance is within normal parameters');
    }

    return recommendations;
  }

  // Health check for performance
  async isHealthy(): Promise<{
    healthy: boolean;
    issues: string[];
  }> {
    const metrics = await this.getPerformanceMetrics();
    const issues: string[] = [];

    if (metrics.transitionLatency.p95 > 2000) {
      issues.push('High latency (>2s)');
    }

    if (metrics.errorRates.errorRate > 10) {
      issues.push('High error rate (>10%)');
    }

    if (metrics.resourceUsage.memoryUsage > 1000) {
      issues.push('High memory usage (>1GB)');
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();
