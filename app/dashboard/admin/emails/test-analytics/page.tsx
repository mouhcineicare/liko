'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  TrendingUp, 
  Eye, 
  MousePointer, 
  AlertCircle,
  TestTube,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmailStats {
  _id: string;
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
}

export default function TestEmailAnalyticsPage() {
  const [stats, setStats] = useState<EmailStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmailStats();
  }, []);

  const fetchEmailStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/emails/analytics');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data.templateStats || []);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error fetching email stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch email statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runEmailTests = async () => {
    try {
      setLoading(true);
      const testResults = [];

      // Test 1: Send a test email
      const testEmail = prompt('Enter your email address for testing:');
      if (!testEmail) return;

      const testResponse = await fetch('/api/admin/emails/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          templateId: 'test', // This will use a default template
          testEmail,
          testData: {
            patientName: 'Test User',
            therapistName: 'Dr. Test Therapist',
            appointmentDate: new Date().toLocaleString(),
            amount: '150 AED'
          }
        })
      });

      const testData = await testResponse.json();
      testResults.push({
        test: 'Send Test Email',
        success: testData.success,
        message: testData.message,
        logId: testData.logId
      });

      // Test 2: Check analytics
      const analyticsResponse = await fetch('/api/admin/emails/analytics');
      const analyticsData = await analyticsResponse.json();
      testResults.push({
        test: 'Fetch Analytics',
        success: analyticsData.success,
        message: `Found ${analyticsData.data?.templateStats?.length || 0} template types`,
        data: analyticsData.data
      });

      // Test 3: Migrate existing tracking data
      const migrateResponse = await fetch('/api/admin/emails/migrate-existing-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const migrateData = await migrateResponse.json();
      testResults.push({
        test: 'Migrate Email Tracking',
        success: migrateData.success,
        message: migrateData.message,
        migrated: migrateData.summary?.migrated || 0
      });

      setTestResults(testResults);
      
      // Refresh stats
      await fetchEmailStats();

      toast({
        title: "Tests Completed",
        description: "Email system tests completed successfully!",
      });

    } catch (error) {
      console.error('Error running email tests:', error);
      toast({
        title: "Test Error",
        description: "Failed to run email tests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Analytics Test</h1>
        <p className="text-gray-600">Test email tracking and analytics functionality</p>
      </div>

      {/* Test Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Email System Tests
          </CardTitle>
          <CardDescription>Run comprehensive tests on the email tracking system</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runEmailTests} disabled={loading}>
            <TestTube className="w-4 h-4 mr-2" />
            Run Email Tests
          </Button>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{result.test}</h3>
                    <p className="text-sm text-gray-600">{result.message}</p>
                    {result.logId && (
                      <p className="text-xs text-blue-600">Log ID: {result.logId}</p>
                    )}
                    {result.migrated && (
                      <p className="text-xs text-green-600">Migrated: {result.migrated} emails</p>
                    )}
                  </div>
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {result.success ? "Success" : "Failed"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Email Statistics
          </CardTitle>
          <CardDescription>Current email performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No email data found</p>
              <p className="text-sm">Run the email tests or migrate existing data to see statistics</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.map((stat) => (
                <div key={stat._id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">{stat._id}</h3>
                    <Badge variant="outline">{stat.totalSent} sent</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                        <span className="text-sm font-medium">Delivered</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">{stat.delivered}</p>
                      <p className="text-xs text-gray-600">
                        {formatPercentage(stat.delivered, stat.totalSent)}
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Eye className="w-4 h-4 text-blue-600 mr-1" />
                        <span className="text-sm font-medium">Opened</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{stat.opened}</p>
                      <p className="text-xs text-gray-600">
                        {formatPercentage(stat.opened, stat.totalSent)}
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <MousePointer className="w-4 h-4 text-purple-600 mr-1" />
                        <span className="text-sm font-medium">Clicked</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">{stat.clicked}</p>
                      <p className="text-xs text-gray-600">
                        {formatPercentage(stat.clicked, stat.totalSent)}
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <AlertCircle className="w-4 h-4 text-red-600 mr-1" />
                        <span className="text-sm font-medium">Failed</span>
                      </div>
                      <p className="text-2xl font-bold text-red-600">{stat.failed}</p>
                      <p className="text-xs text-gray-600">
                        {formatPercentage(stat.failed, stat.totalSent)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
