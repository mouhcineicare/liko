'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock, Database, Activity } from 'lucide-react';

interface StatusMetrics {
  totalAppointments: number;
  statusDistribution: Record<string, number>;
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

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  responseTime: string;
  system: {
    newTransitionSystem: boolean;
    uptime: number;
    version: string;
  };
  metrics: {
    totalAppointments: number;
    statusDistribution: Record<string, number>;
    last24Hours: {
      transitions: number;
      errors: number;
      successfulTransitions: number;
    };
  };
  alerts: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    activeAlerts: number;
    criticalAlerts: number;
    lastCheck: string;
  };
  performance: {
    latency: {
      average: string;
      p95: string;
    };
    throughput: {
      perHour: number;
      perMinute: number;
    };
    errorRate: string;
    memoryUsage: string;
  };
  health: {
    healthy: boolean;
    issues: string[];
  };
  systemHealth: {
    newSystemActive: boolean;
    legacyStatusesFound: number;
    invalidTransitions: number;
    missingRequiredFields: number;
  };
}

export default function StatusSystemDashboard() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/health/status-system');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch health data');
      }
      
      setHealthData(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
    const interval = setInterval(fetchHealthData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'unhealthy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (loading && !healthData) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading health data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <XCircle className="h-8 w-8 text-red-500" />
        <span className="ml-2 text-red-500">Error: {error}</span>
        <Button onClick={fetchHealthData} className="ml-4" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  if (!healthData) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Status System Dashboard</h1>
          <p className="text-gray-600">Real-time monitoring of appointment status transitions</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge className={getStatusColor(healthData.status)}>
            {getStatusIcon(healthData.status)}
            <span className="ml-1">{healthData.status.toUpperCase()}</span>
          </Badge>
          <Button onClick={fetchHealthData} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="ml-1">Refresh</span>
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            {getStatusIcon(healthData.status)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthData.status}</div>
            <p className="text-xs text-gray-600">
              Response: {healthData.responseTime}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Database className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthData.metrics.totalAppointments.toLocaleString()}</div>
            <p className="text-xs text-gray-600">
              Last updated: {new Date(healthData.timestamp).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24h Transitions</CardTitle>
            <Activity className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthData.metrics.last24Hours.transitions}</div>
            <p className="text-xs text-gray-600">
              Success rate: {((healthData.metrics.last24Hours.successfulTransitions / Math.max(healthData.metrics.last24Hours.transitions, 1)) * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthData.alerts.activeAlerts}</div>
            <p className="text-xs text-gray-600">
              Critical: {healthData.alerts.criticalAlerts}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(healthData.metrics.statusDistribution).map(([status, count]) => (
              <div key={status} className="text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-gray-600 capitalize">{status.replace('_', ' ')}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Average Latency</span>
              <span className="font-medium">{healthData.performance.latency.average}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">P95 Latency</span>
              <span className="font-medium">{healthData.performance.latency.p95}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Error Rate</span>
              <span className="font-medium">{healthData.performance.errorRate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Memory Usage</span>
              <span className="font-medium">{healthData.performance.memoryUsage}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">New System Active</span>
              <Badge className={healthData.systemHealth.newSystemActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {healthData.systemHealth.newSystemActive ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Legacy Statuses</span>
              <span className="font-medium">{healthData.systemHealth.legacyStatusesFound}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Invalid Transitions</span>
              <span className="font-medium">{healthData.systemHealth.invalidTransitions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Missing Fields</span>
              <span className="font-medium">{healthData.systemHealth.missingRequiredFields}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issues */}
      {healthData.health.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Issues Detected</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {healthData.health.issues.map((issue, index) => (
                <li key={index} className="flex items-center">
                  <XCircle className="h-4 w-4 text-red-500 mr-2" />
                  <span className="text-sm">{issue}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        Last refreshed: {lastRefresh.toLocaleTimeString()} | 
        Uptime: {formatUptime(healthData.system.uptime)} | 
        Version: {healthData.system.version}
      </div>
    </div>
  );
}
