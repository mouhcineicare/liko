'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mail, 
  TrendingUp, 
  Eye, 
  MousePointer, 
  AlertCircle, 
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmailAnalytics {
  summary: {
    totalEmails: number;
    deliveryRate: string;
    openRate: string;
    clickRate: string;
    failureRate: string;
  };
  templateStats: Array<{
    _id: string;
    totalSent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  }>;
  dailyStats: Array<{
    _id: string;
    count: number;
    opened: number;
    clicked: number;
  }>;
  reminderStats: Array<{
    _id: string;
    totalSent: number;
    opened: number;
    clicked: number;
  }>;
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
}

export default function EmailAnalyticsPage() {
  const [analytics, setAnalytics] = useState<EmailAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedTemplate, setSelectedTemplate] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod, selectedTemplate]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        days: selectedPeriod,
        ...(selectedTemplate !== 'all' && { templateType: selectedTemplate })
      });

      const response = await fetch(`/api/admin/emails/analytics?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.data);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error fetching email analytics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch email analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPercentage = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `${num.toFixed(1)}%`;
  };

  const getStatusColor = (rate: string | number) => {
    const num = typeof rate === 'string' ? parseFloat(rate) : rate;
    if (num >= 80) return 'text-green-600';
    if (num >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading email analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No analytics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Analytics</h1>
        <p className="text-gray-600">Track email performance and delivery statistics</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Templates</SelectItem>
            <SelectItem value="PaymentReminder">Payment Reminders</SelectItem>
            <SelectItem value="PaymentConfirmation">Payment Confirmations</SelectItem>
            <SelectItem value="AppointmentApproval">Appointment Approvals</SelectItem>
            <SelectItem value="TherapistAssignment">Therapist Assignments</SelectItem>
            <SelectItem value="PatientAssignment">Patient Assignments</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={fetchAnalytics} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Emails</p>
                <p className="text-2xl font-bold">{analytics.summary.totalEmails}</p>
              </div>
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Delivery Rate</p>
                <p className={`text-2xl font-bold ${getStatusColor(analytics.summary.deliveryRate)}`}>
                  {formatPercentage(analytics.summary.deliveryRate)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open Rate</p>
                <p className={`text-2xl font-bold ${getStatusColor(analytics.summary.openRate)}`}>
                  {formatPercentage(analytics.summary.openRate)}
                </p>
              </div>
              <Eye className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Click Rate</p>
                <p className={`text-2xl font-bold ${getStatusColor(analytics.summary.clickRate)}`}>
                  {formatPercentage(analytics.summary.clickRate)}
                </p>
              </div>
              <MousePointer className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Failure Rate</p>
                <p className={`text-2xl font-bold ${getStatusColor(analytics.summary.failureRate)}`}>
                  {formatPercentage(analytics.summary.failureRate)}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Daily Stats
          </TabsTrigger>
          <TabsTrigger value="reminders" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Reminders
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        {/* Template Statistics */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Template Performance</CardTitle>
              <CardDescription>Email performance by template type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Template Type</th>
                      <th className="text-left p-3 font-medium">Sent</th>
                      <th className="text-left p-3 font-medium">Delivered</th>
                      <th className="text-left p-3 font-medium">Opened</th>
                      <th className="text-left p-3 font-medium">Clicked</th>
                      <th className="text-left p-3 font-medium">Failed</th>
                      <th className="text-left p-3 font-medium">Open Rate</th>
                      <th className="text-left p-3 font-medium">Click Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.templateStats.map((stat) => (
                      <tr key={stat._id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <Badge variant="outline">{stat._id}</Badge>
                        </td>
                        <td className="p-3">{stat.totalSent}</td>
                        <td className="p-3">{stat.delivered}</td>
                        <td className="p-3">{stat.opened}</td>
                        <td className="p-3">{stat.clicked}</td>
                        <td className="p-3 text-red-600">{stat.failed}</td>
                        <td className={`p-3 ${getStatusColor(stat.openRate)}`}>
                          {formatPercentage(stat.openRate)}
                        </td>
                        <td className={`p-3 ${getStatusColor(stat.clickRate)}`}>
                          {formatPercentage(stat.clickRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Statistics */}
        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>Daily Email Volume</CardTitle>
              <CardDescription>Email activity over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.dailyStats.map((day) => (
                  <div key={day._id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{new Date(day._id).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-600">
                        {day.opened} opened, {day.clicked} clicked
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{day.count}</p>
                      <p className="text-sm text-gray-600">emails sent</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reminder Statistics */}
        <TabsContent value="reminders">
          <Card>
            <CardHeader>
              <CardTitle>Payment Reminder Performance</CardTitle>
              <CardDescription>Effectiveness of different reminder types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analytics.reminderStats.map((reminder) => (
                  <Card key={reminder._id}>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <Badge variant="outline" className="mb-2">
                          {reminder._id || 'Unknown'}
                        </Badge>
                        <p className="text-2xl font-bold">{reminder.totalSent}</p>
                        <p className="text-sm text-gray-600">Total Sent</p>
                        <div className="mt-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Opened:</span>
                            <span>{reminder.opened}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Clicked:</span>
                            <span>{reminder.clicked}</span>
                          </div>
                          <div className="flex justify-between text-sm font-medium">
                            <span>Open Rate:</span>
                            <span className={getStatusColor((reminder.opened / reminder.totalSent) * 100)}>
                              {formatPercentage((reminder.opened / reminder.totalSent) * 100)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Overview */}
        <TabsContent value="performance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>Overall email performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Emails Sent</span>
                    <span className="font-bold">{analytics.summary.totalEmails}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Delivery Rate</span>
                    <span className={`font-bold ${getStatusColor(analytics.summary.deliveryRate)}`}>
                      {formatPercentage(analytics.summary.deliveryRate)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Open Rate</span>
                    <span className={`font-bold ${getStatusColor(analytics.summary.openRate)}`}>
                      {formatPercentage(analytics.summary.openRate)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Click Rate</span>
                    <span className={`font-bold ${getStatusColor(analytics.summary.clickRate)}`}>
                      {formatPercentage(analytics.summary.clickRate)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Period Information</CardTitle>
                <CardDescription>Analytics time range</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Period</span>
                    <span className="font-bold">{analytics.period.days} days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Start Date</span>
                    <span className="font-bold">
                      {new Date(analytics.period.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>End Date</span>
                    <span className="font-bold">
                      {new Date(analytics.period.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
