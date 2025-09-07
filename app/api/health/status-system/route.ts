import { NextResponse } from "next/server";
import { statusMonitor } from "@/lib/services/monitoring/status-monitor";
import { alertingSystem } from "@/lib/services/monitoring/alerting";
import { performanceMonitor } from "@/lib/services/monitoring/performance";
import { USE_NEW_TRANSITION_SYSTEM } from "@/lib/utils/statusMapping";

export async function GET() {
  try {
    const startTime = Date.now();
    
    // Get all health data
    const [metrics, alerts, performance, healthStatus] = await Promise.all([
      statusMonitor.getMetrics(),
      alertingSystem.getHealthStatus(),
      performanceMonitor.getPerformanceMetrics(),
      performanceMonitor.isHealthy()
    ]);

    const responseTime = Date.now() - startTime;

    // Determine overall health
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (healthStatus.issues.length > 0 || alerts.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (alerts.status === 'degraded' || metrics.systemHealth.legacyStatusesFound > 0) {
      overallStatus = 'degraded';
    }

    const healthData = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      system: {
        newTransitionSystem: USE_NEW_TRANSITION_SYSTEM,
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      },
      metrics: {
        totalAppointments: metrics.totalAppointments,
        statusDistribution: metrics.statusDistribution,
        last24Hours: metrics.last24Hours
      },
      alerts: {
        status: alerts.status,
        activeAlerts: alerts.activeAlerts,
        criticalAlerts: alerts.criticalAlerts,
        lastCheck: alerts.lastCheck
      },
      performance: {
        latency: {
          average: `${performance.transitionLatency.average.toFixed(2)}ms`,
          p95: `${performance.transitionLatency.p95.toFixed(2)}ms`
        },
        throughput: {
          perHour: performance.throughput.transitionsPerHour,
          perMinute: performance.throughput.transitionsPerMinute
        },
        errorRate: `${performance.errorRates.errorRate.toFixed(2)}%`,
        memoryUsage: `${performance.resourceUsage.memoryUsage.toFixed(2)}MB`
      },
      health: {
        healthy: healthStatus.healthy,
        issues: healthStatus.issues
      },
      systemHealth: metrics.systemHealth
    };

    // Set appropriate HTTP status code
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(healthData, { status: httpStatus });
  } catch (error) {
    console.error("Health check failed:", error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
