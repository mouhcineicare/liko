import { APPOINTMENT_STATUSES } from "@/lib/utils/statusMapping";

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: any;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: any) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  cooldownMinutes: number;
}

export class AlertingSystem {
  private static instance: AlertingSystem;
  private alerts: Alert[] = [];
  private rules: AlertRule[] = [];
  private lastAlertTimes: Map<string, Date> = new Map();

  static getInstance(): AlertingSystem {
    if (!AlertingSystem.instance) {
      AlertingSystem.instance = new AlertingSystem();
      AlertingSystem.instance.initializeRules();
    }
    return AlertingSystem.instance;
  }

  private initializeRules(): void {
    this.rules = [
      {
        id: 'new_system_inactive',
        name: 'New Transition System Inactive',
        condition: (metrics: any) => !metrics?.systemHealth?.newSystemActive,
        severity: 'high',
        message: 'New transition system is not active - using legacy system',
        cooldownMinutes: 60
      },
      {
        id: 'legacy_statuses_found',
        name: 'Legacy Statuses Detected',
        condition: (metrics: any) => metrics?.systemHealth?.legacyStatusesFound > 0,
        severity: 'medium',
        message: `Found ${metrics?.systemHealth?.legacyStatusesFound || 0} appointments with legacy statuses`,
        cooldownMinutes: 120
      },
      {
        id: 'invalid_transitions',
        name: 'Invalid Transitions Detected',
        condition: (metrics: any) => metrics?.systemHealth?.invalidTransitions > 0,
        severity: 'high',
        message: `Found ${metrics?.systemHealth?.invalidTransitions || 0} appointments with invalid transitions`,
        cooldownMinutes: 30
      },
      {
        id: 'missing_required_fields',
        name: 'Missing Required Fields',
        condition: (metrics: any) => metrics?.systemHealth?.missingRequiredFields > 0,
        severity: 'critical',
        message: `Found ${metrics?.systemHealth?.missingRequiredFields || 0} appointments with missing required fields`,
        cooldownMinutes: 15
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        condition: (metrics: any) => metrics?.last24Hours?.errorRate > 5,
        severity: 'high',
        message: `High error rate: ${metrics?.last24Hours?.errorRate?.toFixed(2) || 0}%`,
        cooldownMinutes: 30
      },
      {
        id: 'no_recent_transitions',
        name: 'No Recent Transitions',
        condition: (metrics: any) => metrics?.last24Hours?.transitions === 0,
        severity: 'medium',
        message: 'No transitions in last 24 hours - system may not be active',
        cooldownMinutes: 240
      },
      {
        id: 'low_transition_volume',
        name: 'Low Transition Volume',
        condition: (metrics: any) => (metrics?.last24Hours?.transitions || 0) < 5 && (metrics?.last24Hours?.transitions || 0) > 0,
        severity: 'low',
        message: `Low transition volume: ${metrics?.last24Hours?.transitions || 0} transitions in 24h`,
        cooldownMinutes: 480
      }
    ];
  }

  async checkAlerts(metrics: any): Promise<Alert[]> {
    const newAlerts: Alert[] = [];

    for (const rule of this.rules) {
      if (rule.condition(metrics)) {
        const alertId = `${rule.id}_${new Date().toISOString().split('T')[0]}`;
        const lastAlertTime = this.lastAlertTimes.get(rule.id);
        
        // Check cooldown
        if (!lastAlertTime || 
            (Date.now() - lastAlertTime.getTime()) > rule.cooldownMinutes * 60 * 1000) {
          
          const alert: Alert = {
            id: alertId,
            type: rule.severity === 'critical' || rule.severity === 'high' ? 'error' : 
                  rule.severity === 'medium' ? 'warning' : 'info',
            severity: rule.severity,
            title: rule.name,
            message: rule.message,
            timestamp: new Date(),
            resolved: false,
            metadata: { ruleId: rule.id, metrics }
          };

          newAlerts.push(alert);
          this.alerts.push(alert);
          this.lastAlertTimes.set(rule.id, new Date());
        }
      }
    }

    return newAlerts;
  }

  async createCustomAlert(
    type: 'error' | 'warning' | 'info',
    severity: 'low' | 'medium' | 'high' | 'critical',
    title: string,
    message: string,
    metadata?: any
  ): Promise<Alert> {
    const alert: Alert = {
      id: `custom_${Date.now()}`,
      type,
      severity,
      title,
      message,
      timestamp: new Date(),
      resolved: false,
      metadata
    };

    this.alerts.push(alert);
    return alert;
  }

  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return this.alerts.filter(alert => !alert.resolved);
  }

  async getAllAlerts(limit: number = 50): Promise<Alert[]> {
    return this.alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getAlertsBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): Promise<Alert[]> {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  async clearOldAlerts(daysOld: number = 7): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const initialCount = this.alerts.length;
    
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoffDate);
    
    return initialCount - this.alerts.length;
  }

  // Integration with external alerting systems
  async sendSlackAlert(alert: Alert, webhookUrl: string): Promise<void> {
    const color = {
      'critical': '#FF0000',
      'high': '#FF6600',
      'medium': '#FFAA00',
      'low': '#00AA00'
    }[alert.severity];

    const payload = {
      attachments: [{
        color,
        title: alert.title,
        text: alert.message,
        fields: [
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Time',
            value: alert.timestamp.toISOString(),
            short: true
          }
        ],
        footer: 'TherapyGlow Status System',
        ts: Math.floor(alert.timestamp.getTime() / 1000)
      }]
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  async sendEmailAlert(alert: Alert, emailConfig: { to: string; from: string; subject?: string }): Promise<void> {
    // This would integrate with your existing email system
    console.log(`Email alert: ${alert.title} - ${alert.message}`);
  }

  // Health check endpoint data
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    activeAlerts: number;
    criticalAlerts: number;
    lastCheck: Date;
    uptime: number;
  }> {
    const activeAlerts = await this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (criticalAlerts > 0) {
      status = 'unhealthy';
    } else if (activeAlerts.length > 0) {
      status = 'degraded';
    }

    return {
      status,
      activeAlerts: activeAlerts.length,
      criticalAlerts,
      lastCheck: new Date(),
      uptime: process.uptime()
    };
  }
}

export const alertingSystem = AlertingSystem.getInstance();
