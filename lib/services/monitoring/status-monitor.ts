import { APPOINTMENT_STATUSES, USE_NEW_TRANSITION_SYSTEM } from "@/lib/utils/statusMapping";
import Appointment from "@/lib/db/models/Appointment";
import { AppointmentHistory } from "../appointments/history";

export interface StatusMetrics {
  totalAppointments: number;
  statusDistribution: Record<string, number>;
  transitionCounts: Record<string, Record<string, number>>;
  errorCounts: Record<string, number>;
  averageTransitionTime: number;
  last24Hours: {
    transitions: number;
    errors: number;
    successfulTransitions: number;
  };
  systemHealth: {
    newSystemActive: boolean;
    legacyStatusesFound: number;
    invalidTransitions: number;
    missingRequiredFields: number;
  };
}

export class StatusMonitor {
  private static instance: StatusMonitor;
  private metrics: StatusMetrics | null = null;
  private lastUpdate: Date | null = null;

  static getInstance(): StatusMonitor {
    if (!StatusMonitor.instance) {
      StatusMonitor.instance = new StatusMonitor();
    }
    return StatusMonitor.instance;
  }

  async getMetrics(): Promise<StatusMetrics> {
    // Cache metrics for 5 minutes
    if (this.metrics && this.lastUpdate && 
        (Date.now() - this.lastUpdate.getTime()) < 5 * 60 * 1000) {
      return this.metrics;
    }

    await this.updateMetrics();
    return this.metrics!;
  }

  private async updateMetrics(): Promise<void> {
    try {
      // Get status distribution
      const statusDistribution = await this.getStatusDistribution();
      
      // Get transition counts
      const transitionCounts = await this.getTransitionCounts();
      
      // Get error counts
      const errorCounts = await this.getErrorCounts();
      
      // Get last 24 hours data
      const last24Hours = await this.getLast24HoursData();
      
      // Get system health
      const systemHealth = await this.getSystemHealth();

      this.metrics = {
        totalAppointments: Object.values(statusDistribution).reduce((a, b) => a + b, 0),
        statusDistribution,
        transitionCounts,
        errorCounts,
        averageTransitionTime: await this.getAverageTransitionTime(),
        last24Hours,
        systemHealth
      };

      this.lastUpdate = new Date();
    } catch (error) {
      console.error("Failed to update status metrics:", error);
      throw error;
    }
  }

  private async getStatusDistribution(): Promise<Record<string, number>> {
    const pipeline = [
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ];

    const results = await Appointment.aggregate(pipeline);
    const distribution: Record<string, number> = {};
    
    results.forEach(({ _id, count }) => {
      distribution[_id] = count;
    });

    return distribution;
  }

  private async getTransitionCounts(): Promise<Record<string, Record<string, number>>> {
    const pipeline = [
      { $group: { _id: { from: '$from', to: '$to' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ];

    const results = await AppointmentHistory.aggregate(pipeline);
    const transitions: Record<string, Record<string, number>> = {};
    
    results.forEach(({ _id, count }) => {
      if (!transitions[_id.from]) {
        transitions[_id.from] = {};
      }
      transitions[_id.from][_id.to] = count;
    });

    return transitions;
  }

  private async getErrorCounts(): Promise<Record<string, number>> {
    // This would typically come from error logs or a dedicated error collection
    // For now, we'll return empty counts
    return {
      'transition_failed': 0,
      'history_recording_failed': 0,
      'event_handler_failed': 0,
      'business_rule_violation': 0
    };
  }

  private async getLast24HoursData(): Promise<{ transitions: number; errors: number; successfulTransitions: number }> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const transitions = await AppointmentHistory.countDocuments({
      ts: { $gte: yesterday }
    });

    // This would typically come from error logs
    const errors = 0;
    const successfulTransitions = transitions - errors;

    return { transitions, errors, successfulTransitions };
  }

  private async getSystemHealth(): Promise<{
    newSystemActive: boolean;
    legacyStatusesFound: number;
    invalidTransitions: number;
    missingRequiredFields: number;
  }> {
    const legacyStatuses = ['not_paid', 'pending_approval', 'approved', 'rejected', 'in_progress', 'completed_pending_validation', 'completed_validated', 'upcoming'];
    
    const legacyStatusesFound = await Appointment.countDocuments({
      status: { $in: legacyStatuses }
    });

    // Check for invalid transitions
    const invalidTransitions = await Appointment.countDocuments({
      $or: [
        { status: 'unpaid', paymentStatus: 'completed' },
        { status: 'pending_match', paymentStatus: 'pending' },
        { status: 'confirmed', date: { $exists: false } },
        { status: 'pending_scheduling', therapist: { $exists: false } }
      ]
    });

    // Check for missing required fields
    const missingRequiredFields = await Appointment.countDocuments({
      $or: [
        { status: { $exists: false } },
        { paymentStatus: { $exists: false } },
        { patient: { $exists: false } }
      ]
    });

    return {
      newSystemActive: USE_NEW_TRANSITION_SYSTEM,
      legacyStatusesFound,
      invalidTransitions,
      missingRequiredFields
    };
  }

  private async getAverageTransitionTime(): Promise<number> {
    // This would typically measure the time between status changes
    // For now, return a placeholder
    return 0;
  }

  async getDetailedStatusReport(): Promise<any> {
    const metrics = await this.getMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalAppointments: metrics.totalAppointments,
        systemHealth: metrics.systemHealth.newSystemActive ? 'HEALTHY' : 'LEGACY_MODE',
        last24HoursTransitions: metrics.last24Hours.transitions,
        errorRate: metrics.last24Hours.errors / Math.max(metrics.last24Hours.transitions, 1) * 100
      },
      statusDistribution: metrics.statusDistribution,
      topTransitions: this.getTopTransitions(metrics.transitionCounts),
      alerts: this.generateAlerts(metrics),
      recommendations: this.generateRecommendations(metrics)
    };
  }

  private getTopTransitions(transitionCounts: Record<string, Record<string, number>>): Array<{ from: string; to: string; count: number }> {
    const transitions: Array<{ from: string; to: string; count: number }> = [];
    
    Object.entries(transitionCounts).forEach(([from, toCounts]) => {
      Object.entries(toCounts).forEach(([to, count]) => {
        transitions.push({ from, to, count });
      });
    });

    return transitions.sort((a, b) => b.count - a.count).slice(0, 10);
  }

  private generateAlerts(metrics: StatusMetrics): string[] {
    const alerts: string[] = [];

    if (!metrics.systemHealth.newSystemActive) {
      alerts.push("⚠️ New transition system is not active");
    }

    if (metrics.systemHealth.legacyStatusesFound > 0) {
      alerts.push(`⚠️ Found ${metrics.systemHealth.legacyStatusesFound} appointments with legacy statuses`);
    }

    if (metrics.systemHealth.invalidTransitions > 0) {
      alerts.push(`🚨 Found ${metrics.systemHealth.invalidTransitions} appointments with invalid transitions`);
    }

    if (metrics.systemHealth.missingRequiredFields > 0) {
      alerts.push(`🚨 Found ${metrics.systemHealth.missingRequiredFields} appointments with missing required fields`);
    }

    if (metrics.last24Hours.errorRate > 5) {
      alerts.push(`🚨 High error rate: ${metrics.last24Hours.errorRate.toFixed(2)}%`);
    }

    if (alerts.length === 0) {
      alerts.push("✅ All systems healthy");
    }

    return alerts;
  }

  private generateRecommendations(metrics: StatusMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.systemHealth.legacyStatusesFound > 0) {
      recommendations.push("Run migration script to convert legacy statuses");
    }

    if (metrics.systemHealth.invalidTransitions > 0) {
      recommendations.push("Review and fix invalid appointment transitions");
    }

    if (metrics.last24Hours.transitions < 10) {
      recommendations.push("Low transition volume - verify system is being used");
    }

    return recommendations;
  }
}

export const statusMonitor = StatusMonitor.getInstance();
