'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, Settings, BarChart3, TestTube, Plus, Edit, Eye, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TemplateEditor from '@/components/dashboard/admin/emails/TemplateEditor';

interface EmailTemplate {
  _id: string;
  name: string;
  type: string;
  subject: string;
  isActive: boolean;
  recipients: {
    patient: boolean;
    therapist: boolean;
    admin: boolean;
    custom: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export default function EnhancedAdminEmailsPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('templates');
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      // Only fetch from enhanced templates
      const response = await fetch('/api/admin/emails/templates-enhanced');
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.templates);
      } else {
        throw new Error(data.error || 'Failed to fetch enhanced templates');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch email templates. Please initialize templates first.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInitTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/emails/init-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      if (data.success) {
        fetchTemplates();
        toast({
          title: "Success",
          description: "All email templates initialized successfully!",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initialize templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateExisting = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/emails/migrate-existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      if (data.success) {
        fetchTemplates();
        toast({
          title: "Success",
          description: `Migration completed! ${data.summary.migrated} templates migrated successfully.`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to migrate existing templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateEmailTracking = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/emails/migrate-existing-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: `Email tracking migration completed! ${data.summary.migrated} emails migrated successfully.`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to migrate email tracking data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async (templateId: string) => {
    const testEmail = prompt('Enter test email address:');
    if (!testEmail) return;

    try {
      const response = await fetch('/api/admin/emails/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, recipientEmail: testEmail })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: `Test email sent to ${testEmail}`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive",
      });
    }
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setShowTemplateEditor(true);
  };

  const handleSaveTemplate = async (templateData: any) => {
    try {
      const response = await fetch('/api/admin/emails/templates-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });

      const data = await response.json();
      if (data.success) {
        fetchTemplates();
        setShowTemplateEditor(false);
        setEditingTemplate(null);
        toast({
          title: "Success",
          description: "Template saved successfully!",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    }
  };

  const getRecipientCount = (recipients: any) => {
    let count = 0;
    if (recipients.patient) count++;
    if (recipients.therapist) count++;
    if (recipients.admin) count++;
    count += recipients.custom?.length || 0;
    return count;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading email management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhanced Email Management</h1>
        <p className="text-gray-600">Manage email templates with recipient controls</p>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Email Templates</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleMigrateExisting}
              disabled={loading}
            >
              Migrate Templates
            </Button>
            <Button
              variant="outline"
              onClick={handleMigrateEmailTracking}
              disabled={loading}
            >
              Migrate Email Tracking
            </Button>
            <Button
              variant="outline"
              onClick={handleInitTemplates}
              disabled={loading}
            >
              Initialize Templates
            </Button>
            <Button onClick={() => setShowTemplateEditor(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>
        </div>

        {/* Email Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Templates</p>
                  <p className="text-2xl font-bold">{templates.length}</p>
                </div>
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Templates</p>
                  <p className="text-2xl font-bold text-green-600">
                    {templates.filter(t => t.isActive).length}
                  </p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Inactive Templates</p>
                  <p className="text-2xl font-bold text-gray-600">
                    {templates.filter(t => !t.isActive).length}
                  </p>
                </div>
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">With Recipients</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {templates.filter(t => t.recipients && (
                      t.recipients.patient || 
                      t.recipients.therapist || 
                      t.recipients.admin || 
                      (t.recipients.custom && t.recipients.custom.length > 0)
                    )).length}
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email Templates Table */}
        <Card>
          <CardHeader>
            <CardTitle>Email Templates ({templates.length})</CardTitle>
            <CardDescription>Manage all email templates and their settings</CardDescription>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No email templates found</p>
                <p className="text-sm">Click "Initialize Templates" to create default templates</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Template Name</th>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-left p-3 font-medium">Subject</th>
                      <th className="text-left p-3 font-medium">Recipients</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Created</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((template) => (
                      <tr key={template._id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium">{template.name}</div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{template.type}</Badge>
                        </td>
                        <td className="p-3">
                          <div className="text-sm text-gray-600 max-w-xs truncate">
                            {template.subject}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {template.recipients?.patient && (
                              <Badge variant="secondary" className="text-xs">Patient</Badge>
                            )}
                            {template.recipients?.therapist && (
                              <Badge variant="secondary" className="text-xs">Therapist</Badge>
                            )}
                            {template.recipients?.admin && (
                              <Badge variant="secondary" className="text-xs">Admin</Badge>
                            )}
                            {template.recipients?.custom?.map((email, index) => (
                              <Badge key={index} variant="outline" className="text-xs">{email}</Badge>
                            ))}
                            {!template.recipients && (
                              <Badge variant="outline" className="text-xs">No recipients set</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant={template.isActive ? "default" : "secondary"}>
                            {template.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="text-sm text-gray-600">
                            {new Date(template.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTestEmail(template._id)}
                              title="Test Email"
                            >
                              <TestTube className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditTemplate(template)}
                              title="Edit Template"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              title="View Template"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Template Editor Dialog */}
      <Dialog open={showTemplateEditor} onOpenChange={setShowTemplateEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
          </DialogHeader>
          <TemplateEditor
            template={editingTemplate}
            onSave={handleSaveTemplate}
            onTest={handleTestEmail}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
