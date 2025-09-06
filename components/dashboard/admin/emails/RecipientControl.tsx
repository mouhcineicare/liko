'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Users } from 'lucide-react';

interface RecipientControlProps {
  recipients: {
    patient: boolean;
    therapist: boolean;
    admin: boolean;
    custom: string[];
  };
  onChange: (recipients: {
    patient: boolean;
    therapist: boolean;
    admin: boolean;
    custom: string[];
  }) => void;
}

export default function RecipientControl({ recipients, onChange }: RecipientControlProps) {
  const [newCustomEmail, setNewCustomEmail] = useState('');

  const handleRecipientChange = (type: 'patient' | 'therapist' | 'admin', checked: boolean) => {
    onChange({
      ...recipients,
      [type]: checked
    });
  };

  const addCustomEmail = () => {
    if (newCustomEmail && !recipients.custom.includes(newCustomEmail)) {
      onChange({
        ...recipients,
        custom: [...recipients.custom, newCustomEmail]
      });
      setNewCustomEmail('');
    }
  };

  const removeCustomEmail = (email: string) => {
    onChange({
      ...recipients,
      custom: recipients.custom.filter(e => e !== email)
    });
  };

  const getRecipientCount = () => {
    let count = 0;
    if (recipients.patient) count++;
    if (recipients.therapist) count++;
    if (recipients.admin) count++;
    count += recipients.custom.length;
    return count;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Email Recipients
          <Badge variant="outline">{getRecipientCount()} recipient(s)</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Standard Recipients */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Standard Recipients</Label>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="patient"
              checked={recipients.patient}
              onCheckedChange={(checked) => handleRecipientChange('patient', checked as boolean)}
            />
            <Label htmlFor="patient" className="text-sm">
              Patient
            </Label>
            <Badge variant="secondary" className="text-xs">Primary recipient</Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="therapist"
              checked={recipients.therapist}
              onCheckedChange={(checked) => handleRecipientChange('therapist', checked as boolean)}
            />
            <Label htmlFor="therapist" className="text-sm">
              Therapist
            </Label>
            <Badge variant="secondary" className="text-xs">Session notifications</Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="admin"
              checked={recipients.admin}
              onCheckedChange={(checked) => handleRecipientChange('admin', checked as boolean)}
            />
            <Label htmlFor="admin" className="text-sm">
              Admin
            </Label>
            <Badge variant="secondary" className="text-xs">System notifications</Badge>
          </div>
        </div>

        {/* Custom Recipients */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Custom Recipients</Label>
          
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter email address"
              value={newCustomEmail}
              onChange={(e) => setNewCustomEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCustomEmail()}
            />
            <Button onClick={addCustomEmail} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          {recipients.custom.length > 0 && (
            <div className="space-y-2">
              {recipients.custom.map((email, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="text-sm">{email}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCustomEmail(email)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recipient Preview */}
        <div className="pt-4 border-t">
          <Label className="text-sm font-medium">Preview Recipients</Label>
          <div className="mt-2 space-y-1">
            {recipients.patient && (
              <div className="text-sm text-gray-600">• Patient email (from appointment data)</div>
            )}
            {recipients.therapist && (
              <div className="text-sm text-gray-600">• Therapist email (from appointment data)</div>
            )}
            {recipients.admin && (
              <div className="text-sm text-gray-600">• All admin users</div>
            )}
            {recipients.custom.map((email, index) => (
              <div key={index} className="text-sm text-gray-600">• {email}</div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
