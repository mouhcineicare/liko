'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { StatusService, type AppointmentData } from '@/lib/services/status/StatusService';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  appointment: AppointmentData;
  variant?: 'default' | 'detailed' | 'minimal';
  className?: string;
  showIcon?: boolean;
}

/**
 * Unified Status Badge Component
 * Single source of truth for displaying appointment statuses across the application
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  appointment,
  variant = 'default',
  className,
  showIcon = true
}) => {
  const statusInfo = StatusService.getDisplayStatus(appointment);
  
  if (variant === 'minimal') {
    return (
      <Badge 
        variant="outline" 
        className={cn(statusInfo.className, className)}
      >
        {statusInfo.label}
      </Badge>
    );
  }
  
  if (variant === 'detailed') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge className={statusInfo.className}>
          {showIcon && <span className="mr-1">{statusInfo.icon}</span>}
          {statusInfo.label}
        </Badge>
        <span className="text-xs text-gray-500">{statusInfo.description}</span>
      </div>
    );
  }
  
  return (
    <Badge 
      variant="outline" 
      className={cn(statusInfo.className, className)}
    >
      {showIcon && <span className="mr-1">{statusInfo.icon}</span>}
      {statusInfo.label}
    </Badge>
  );
};

interface StatusMessageProps {
  appointment: AppointmentData;
  userType?: 'patient' | 'therapist' | 'admin';
  className?: string;
}

/**
 * Status Message Component
 * Displays user-friendly status messages based on user type
 */
export const StatusMessage: React.FC<StatusMessageProps> = ({
  appointment,
  userType = 'patient',
  className
}) => {
  const getMessage = () => {
    switch (userType) {
      case 'therapist':
        return StatusService.getTherapistStatusMessage(appointment);
      case 'patient':
        return StatusService.getPatientStatusMessage(appointment);
      case 'admin':
        return StatusService.getDisplayStatus(appointment).description;
      default:
        return StatusService.getPatientStatusMessage(appointment);
    }
  };

  const statusInfo = StatusService.getDisplayStatus(appointment);
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-lg">{statusInfo.icon}</span>
      <span className={cn("text-sm", statusInfo.color)}>
        {getMessage()}
      </span>
    </div>
  );
};

interface StatusCardProps {
  appointment: AppointmentData;
  userType?: 'patient' | 'therapist' | 'admin';
  className?: string;
  children?: React.ReactNode;
}

/**
 * Status Card Component
 * Full status display with background, badge, and message
 */
export const StatusCard: React.FC<StatusCardProps> = ({
  appointment,
  userType = 'patient',
  className,
  children
}) => {
  const statusInfo = StatusService.getDisplayStatus(appointment);
  
  return (
    <div className={cn(
      "p-4 rounded-lg border",
      statusInfo.bgColor,
      statusInfo.color,
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <StatusBadge appointment={appointment} />
        {children}
      </div>
      <StatusMessage appointment={appointment} userType={userType} />
    </div>
  );
};

interface StatusIndicatorProps {
  appointment: AppointmentData;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Status Indicator Component
 * Simple colored dot indicator for status
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  appointment,
  size = 'md',
  className
}) => {
  const statusInfo = StatusService.getDisplayStatus(appointment);
  
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };
  
  const colorMap = {
    'text-red-600': 'bg-red-500',
    'text-orange-600': 'bg-orange-500',
    'text-yellow-600': 'bg-yellow-500',
    'text-blue-600': 'bg-blue-500',
    'text-purple-600': 'bg-purple-500',
    'text-green-600': 'bg-green-500',
    'text-emerald-600': 'bg-emerald-500',
    'text-gray-600': 'bg-gray-500',
    'text-indigo-600': 'bg-indigo-500'
  };
  
  const bgColor = colorMap[statusInfo.color as keyof typeof colorMap] || 'bg-gray-500';
  
  return (
    <div 
      className={cn(
        "rounded-full",
        sizeClasses[size],
        bgColor,
        className
      )}
      title={statusInfo.label}
    />
  );
};

