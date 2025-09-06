'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Eye, Send, Users } from 'lucide-react';
import RecipientControl from './RecipientControl';

interface TemplateEditorProps {
  template?: any;
  onSave: (template: any) => void;
  onTest: (template: any) => void;
}

export default function TemplateEditor({ template, onSave, onTest }: TemplateEditorProps) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    type: template?.type || '',
    subject: template?.subject || '',
    content: template?.content || '',
    buttonLink: template?.buttonLink || '',
    buttonText: template?.buttonText || '',
    isActive: template?.isActive || false,
    variables: template?.variables || [],
    recipients: template?.recipients || {
      patient: true,
      therapist: false,
      admin: false,
      custom: []
    }
  });

  const [newVariable, setNewVariable] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addVariable = () => {
    if (newVariable && !formData.variables.includes(newVariable)) {
      setFormData(prev => ({
        ...prev,
        variables: [...prev.variables, newVariable]
      }));
      setNewVariable('');
    }
  };

  const removeVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v !== variable)
    }));
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      const newText = before + `{{${variable}}}` + after;
      
      setFormData(prev => ({
        ...prev,
        content: newText
      }));
      
      // Set cursor position after the inserted variable
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
      }, 0);
    }
  };

  const getPreviewContent = () => {
    let content = formData.content;
    
    // Replace variables with sample data
    const sampleData = {
      patientName: 'John Doe',
      therapistName: 'Dr. Smith',
      appointmentDate: '2024-01-15 at 2:00 PM',
      amount: '500',
      plan: 'Individual Therapy',
      status: 'Confirmed',
      reason: 'Payment completed',
      meetingLink: 'https://meet.google.com/abc-defg-hij',
      confirmationLink: 'https://icare.com/confirm/123',
      resetLink: 'https://icare.com/reset/456',
      paymentUrl: 'https://icare.com/payment/789'
    };

    formData.variables.forEach(variable => {
      const value = sampleData[variable] || `[${variable}]`;
      content = content.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), value);
    });

    // Replace button placeholder
    if (formData.buttonLink && formData.buttonText) {
      const buttonHtml = `
        <div style="margin: 20px 0; text-align: center;">
          <a href="${formData.buttonLink}" 
             style="background-color: #1890ff; 
                    color: white; 
                    padding: 10px 20px; 
                    text-decoration: none; 
                    border-radius: 4px;
                    font-weight: bold;">
            ${formData.buttonText}
          </a>
        </div>
      `;
      content = content.replace(/\{\{button\}\}/g, buttonHtml);
    }

    return content;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="recipients">Recipients</TabsTrigger>
          <TabsTrigger value="variables">Variables</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Template Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Payment Confirmation"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Template Type</Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PaymentConfirmation">Payment Confirmation</SelectItem>
                      <SelectItem value="TherapistAssignment">Therapist Assignment</SelectItem>
                      <SelectItem value="PatientAssignment">Patient Assignment</SelectItem>
                      <SelectItem value="AppointmentApproval">Appointment Approval</SelectItem>
                      <SelectItem value="AppointmentStatus">Appointment Status</SelectItem>
                      <SelectItem value="NewRegistration">New Registration</SelectItem>
                      <SelectItem value="AccountConfirmation">Account Confirmation</SelectItem>
                      <SelectItem value="NewAppointment">New Appointment</SelectItem>
                      <SelectItem value="PaymentNotification">Payment Notification</SelectItem>
                      <SelectItem value="PaymentDetailsUpdate">Payment Details Update</SelectItem>
                      <SelectItem value="TherapyChangeRequest">Therapy Change Request</SelectItem>
                      <SelectItem value="PasswordReset">Password Reset</SelectItem>
                      <SelectItem value="PasswordResetSuccess">Password Reset Success</SelectItem>
                      <SelectItem value="PaymentReminder">Payment Reminder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  placeholder="e.g., Your iCare Payment is Confirmed!"
                />
              </div>

              <div>
                <Label htmlFor="content">Email Content (HTML)</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  placeholder="Enter your email content here. Use {{variableName}} for dynamic content."
                  rows={10}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="buttonLink">Button Link (optional)</Label>
                  <Input
                    id="buttonLink"
                    value={formData.buttonLink}
                    onChange={(e) => handleInputChange('buttonLink', e.target.value)}
                    placeholder="e.g., {{meetingLink}} or https://example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="buttonText">Button Text (optional)</Label>
                  <Input
                    id="buttonText"
                    value={formData.buttonText}
                    onChange={(e) => handleInputChange('buttonText', e.target.value)}
                    placeholder="e.g., Join Appointment"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recipients Tab */}
        <TabsContent value="recipients">
          <RecipientControl
            recipients={formData.recipients}
            onChange={(recipients) => handleInputChange('recipients', recipients)}
          />
        </TabsContent>

        {/* Variables Tab */}
        <TabsContent value="variables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Template Variables</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter variable name"
                  value={newVariable}
                  onChange={(e) => setNewVariable(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addVariable()}
                />
                <Button onClick={addVariable}>Add Variable</Button>
              </div>

              <div className="space-y-2">
                <Label>Available Variables</Label>
                <div className="flex flex-wrap gap-2">
                  {formData.variables.map((variable) => (
                    <div key={variable} className="flex items-center gap-2 bg-gray-100 p-2 rounded">
                      <Badge variant="outline">{variable}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => insertVariable(variable)}
                      >
                        Insert
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariable(variable)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <Label className="text-sm font-medium">Common Variables</Label>
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <div>• <code>patientName</code> - Patient's full name</div>
                  <div>• <code>therapistName</code> - Therapist's full name</div>
                  <div>• <code>appointmentDate</code> - Appointment date and time</div>
                  <div>• <code>amount</code> - Payment amount</div>
                  <div>• <code>plan</code> - Therapy plan name</div>
                  <div>• <code>status</code> - Appointment status</div>
                  <div>• <code>reason</code> - Status change reason</div>
                  <div>• <code>meetingLink</code> - Video call link</div>
                  <div>• <code>confirmationLink</code> - Account confirmation link</div>
                  <div>• <code>resetLink</code> - Password reset link</div>
                  <div>• <code>paymentUrl</code> - Payment page URL</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Email Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-white">
                <div className="mb-4">
                  <strong>Subject:</strong> {formData.subject}
                </div>
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onTest(formData)}>
          <Send className="w-4 h-4 mr-2" />
          Test Email
        </Button>
        <Button onClick={() => onSave(formData)}>
          <Save className="w-4 h-4 mr-2" />
          Save Template
        </Button>
      </div>
    </div>
  );
}
