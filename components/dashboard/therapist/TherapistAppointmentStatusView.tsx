'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, Video, Eye, Calendar, Clock, User, Phone, Mail, Globe, CheckCircle, ChevronDown, ChevronUp, CreditCard, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PatientData {
  _id: string;
  fullName: string;
  email: string;
  telephone: string;
  image: string;
  timeZone: string;
  totalSessions: number;
  lastAppointment?: string;
  nextAppointment?: string;
  hasMonthlyPackage: boolean;
  hasSingleSessions: boolean;
  hasActivePackage: boolean;
  hasActiveSubscriptions: boolean;
  hasPositiveBalance: boolean;
  hasUpcomingSession: boolean;
}

interface AppointmentData {
  _id: string;
  date: string;
  status: string;
  customStatus: string;
  paymentStatus: string;
  isStripeVerified: boolean;
  stripePaymentStatus: string;
  stripeSubscriptionStatus: string;
  meetingLink?: string;
  therapyType: string;
  price: number;
  plan: string;
  planType: string;
  totalSessions: number;
  completedSessions: number;
  sessionPrice: number;
  comment?: string;
  declineComment?: string;
  reason?: string;
  recurring: any[];
  sessionsHistory: string[];
  patientTimezone: string;
  therapistPaid: boolean;
  payoutStatus: string;
  payoutAttempts: number;
  therapistValidated?: boolean;
  therapistValidatedAt?: string;
  isAccepted?: boolean;
  isConfirmed: boolean;
  isPaid: boolean;
  isBalance?: boolean;
  // Bank-like audit trail fields
  validationReason?: string;
  paymentStatusReason?: string;
  statusTransitionHistory?: Array<{
    fromStatus: string;
    toStatus: string;
    reason: string;
    timestamp: string;
    performedBy: string;
    performedByRole: 'therapist' | 'admin' | 'system';
  }>;
  lastStatusChangeReason?: string;
  lastStatusChangedBy?: string;
  lastStatusChangedAt?: string;
  isRescheduled?: boolean;
  createdAt: string;
  updatedAt: string;
  patient: {
    _id: string;
    fullName: string;
    email: string;
    telephone: string;
    image: string;
    timeZone: string;
  };
  therapist: {
    _id: string;
    fullName: string;
    email: string;
    image: string;
  };
  error?: string;
}

interface PatientsData {
  allPatients: PatientData[];
  activePatients: PatientData[];
  inactivePatients: PatientData[];
}

interface SubscriptionData {
  _id: string;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: Date;
  currentPeriodStart: Date;
  plan: string;
  price: number;
  cancelAtPeriodEnd: boolean;
  productName: string;
  productDescription: string;
  productMetadata: any;
}

interface BalanceData {
  totalSessions: number;
  remainingSessions: number;
  balanceInAED: number;
  history: any[];
}

interface PatientSubscriptionInfo {
  patient: {
    _id: string;
    fullName: string;
    email: string;
  };
  balance: BalanceData;
  subscriptions: SubscriptionData[];
  summary: {
    totalActive: number;
    totalMonthlyValue: number;
    nextRenewal: Date | null;
    hasActiveSubscriptions: boolean;
  };
}

export default function TherapistAppointmentStatusView() {
  const { toast } = useToast();
  const [patientsData, setPatientsData] = useState<PatientsData>({
    allPatients: [],
    activePatients: [],
    inactivePatients: []
  });
  const [appointmentsData, setAppointmentsData] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('appointments');
  const [selectedPatientView, setSelectedPatientView] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set());
  const [meetingLinkInputs, setMeetingLinkInputs] = useState<Record<string, string>>({});
  const [showOnboardingDialog, setShowOnboardingDialog] = useState(false);
  const [selectedPatientOnboarding, setSelectedPatientOnboarding] = useState<any>(null);
  const [selectedAppointments, setSelectedAppointments] = useState<Set<string>>(new Set());
  const [patientSubscriptions, setPatientSubscriptions] = useState<Record<string, PatientSubscriptionInfo>>({});
  const [subscriptionLoading, setSubscriptionLoading] = useState<Record<string, boolean>>({});
  const [expandedSubscriptions, setExpandedSubscriptions] = useState<Set<string>>(new Set());

  // Fetch patients data
  const fetchPatientsData = useCallback(async () => {
    try {
      const response = await fetch('/api/therapist/patients/appointments');
      if (response.ok) {
        const data = await response.json();
        setPatientsData(data);
      } else {
        throw new Error('Failed to fetch patient data');
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      setError('Failed to load patient data');
    }
  }, []);

  // Fetch appointments data with enhanced information
  const fetchAppointmentsData = useCallback(async () => {
    try {
      const response = await fetch('/api/therapist/appointments/enhanced');
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched appointments data:', {
          totalAppointments: data.appointments?.length || 0,
          validatedAppointments: data.appointments?.filter((apt: any) => apt.therapistValidated)?.length || 0,
          sampleValidated: data.appointments?.find((apt: any) => apt.therapistValidated),
          allValidatedAppointments: data.appointments?.filter((apt: any) => apt.therapistValidated)?.map((apt: any) => ({
            id: apt._id,
            status: apt.status,
            therapistValidated: apt.therapistValidated,
            therapistPaid: apt.therapistPaid
          }))
        });
        setAppointmentsData(data.appointments || []);
      } else {
        throw new Error('Failed to fetch enhanced appointment data');
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setError('Failed to load appointment data');
    }
  }, []);

  // Fetch patient subscription data
  const fetchPatientSubscriptionData = useCallback(async (patientId: string) => {
    // Prevent multiple simultaneous requests for the same patient
    if (subscriptionLoading[patientId]) {
      return;
    }

    try {
      setSubscriptionLoading(prev => ({ ...prev, [patientId]: true }));
      
      const response = await fetch(`/api/therapist/patients/${patientId}/subscriptions`);
      if (response.ok) {
        const data = await response.json();
        setPatientSubscriptions(prev => ({
          ...prev,
          [patientId]: data
        }));
      } else {
        throw new Error('Failed to fetch subscription data');
      }
    } catch (error) {
      console.error('Error fetching patient subscription data:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription information",
        variant: "destructive",
      });
    } finally {
      setSubscriptionLoading(prev => ({ ...prev, [patientId]: false }));
    }
  }, [toast, subscriptionLoading]);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchPatientsData(), fetchAppointmentsData()]);
      setLoading(false);
    };
    loadData();
  }, [fetchPatientsData, fetchAppointmentsData]);

  // Auto-load subscription data for all patients when patients data is loaded
  useEffect(() => {
    const allPatientIds = [
      ...patientsData.allPatients.map(p => p._id),
      ...patientsData.activePatients.map(p => p._id),
      ...patientsData.inactivePatients.map(p => p._id)
    ];
    
    // Remove duplicates
    const uniquePatientIds = [...new Set(allPatientIds)];
    
    // Load subscription data for each patient only if not already loaded or loading
    uniquePatientIds.forEach(patientId => {
      const hasData = patientSubscriptions[patientId];
      const isLoading = subscriptionLoading[patientId];
      
      if (!hasData && !isLoading) {
        fetchPatientSubscriptionData(patientId);
      }
    });
  }, [patientsData.allPatients.length, patientsData.activePatients.length, patientsData.inactivePatients.length]); // Only depend on lengths to avoid infinite loops

  // Handle patient selection
  const handlePatientClick = (patient: PatientData) => {
    if (selectedPatientId === patient._id) {
      setSelectedPatientId(null); // Deselect if same patient
    } else {
      setSelectedPatientId(patient._id);
    }
  };

  // Handle meeting link update
  const handleMeetingLinkUpdate = async (appointmentId: string, meetingLink: string) => {
    try {
      const response = await fetch(`/api/therapist/appointments/${appointmentId}/meeting-link`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingLink })
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Meeting link updated successfully",
        });
        // Update local state
        setAppointmentsData(prev => prev.map(apt => 
          apt._id === appointmentId ? { ...apt, meetingLink } : apt
        ));
        // Clear input
        setMeetingLinkInputs(prev => {
          const newInputs = { ...prev };
          delete newInputs[appointmentId];
          return newInputs;
        });
      } else {
        throw new Error('Failed to update meeting link');
      }
    } catch (error) {
      console.error('Error updating meeting link:', error);
      toast({
        title: "Error",
        description: "Failed to update meeting link",
        variant: "destructive",
      });
    }
  };

  // Handle validate payment - ENHANCED: Now integrates with payment system
  const handleValidatePayment = async (appointmentId: string) => {
    try {
      console.log('=== FRONTEND: Starting validation ===');
      console.log('Appointment ID:', appointmentId);
      console.log('Calling endpoint:', `/api/therapist/appointments/${appointmentId}/validate`);
      
      const response = await fetch(`/api/therapist/appointments/${appointmentId}/validate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Response result:', result);
        
        // Check if appointment was already validated
        if (result.alreadyValidated) {
          toast({
            title: "Already Validated",
            description: "This session was already validated and is in the payments section.",
          });
          
          // Auto-redirect to completed section
          if (result.redirectTo === 'completed') {
            // Switch to completed tab
            setSelectedTab('completed');
            // Refresh data to show updated state
            await Promise.all([fetchPatientsData(), fetchAppointmentsData()]);
          }
        } else if (result.alreadyNoShow) {
          toast({
            title: "Already Marked as No-Show",
            description: "This session was already marked as no-show and is in the cancelled section.",
          });
          
          // Auto-redirect to cancelled section
          if (result.redirectTo === 'cancelled') {
            // Switch to cancelled tab
            setSelectedTab('canceled');
            // Refresh data to show updated state
            await Promise.all([fetchPatientsData(), fetchAppointmentsData()]);
          }
        } else {
          toast({
            title: "Success",
            description: "Session validated successfully. Now available for payment processing.",
          });
          await Promise.all([fetchPatientsData(), fetchAppointmentsData()]);
        }
      } else {
        const errorData = await response.json();
        console.log('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to validate appointment');
      }
    } catch (error) {
      console.error('Error validating appointment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to validate appointment",
        variant: "destructive",
      });
    }
  };

  // Handle multiple payment validation
  const handleValidateMultiplePayments = async (appointmentIds: string[]) => {
    try {
      const responses = await Promise.all(
        appointmentIds.map(id => 
          fetch(`/api/therapist/appointments/${id}/validate`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'completed' })
          })
        )
      );

      const results = await Promise.all(
        responses.map(async (response, index) => {
          if (response.ok) {
            return { id: appointmentIds[index], success: true, data: await response.json() };
          } else {
            const errorData = await response.json();
            return { id: appointmentIds[index], success: false, error: errorData.error };
          }
        })
      );

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (successful.length > 0) {
        toast({
          title: "Success",
          description: `${successful.length} session${successful.length > 1 ? 's' : ''} validated successfully. Now available for payment processing.`,
        });

        await Promise.all([fetchPatientsData(), fetchAppointmentsData()]);
      }

      if (failed.length > 0) {
        toast({
          title: "Partial Success",
          description: `${failed.length} session${failed.length > 1 ? 's' : ''} failed to validate. Please try again.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error validating multiple sessions:', error);
      toast({
        title: "Error",
        description: "Failed to validate sessions. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle mark as no-show - FIXED: Correct status value
  const handleMarkNoShow = async (appointmentId: string) => {
    try {
      const response = await fetch(`/api/therapist/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'no-show' })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Check if appointment was already validated
        if (result.alreadyValidated) {
          toast({
            title: "Already Validated",
            description: "This session was already validated and is in the payments section.",
          });
          
          // Auto-redirect to completed section
          if (result.redirectTo === 'completed') {
            setSelectedTab('completed');
            await Promise.all([fetchPatientsData(), fetchAppointmentsData()]);
          }
        } else if (result.alreadyNoShow) {
          toast({
            title: "Already Marked as No-Show",
            description: "This session was already marked as no-show and is in the cancelled section.",
          });
          
          // Auto-redirect to cancelled section
          if (result.redirectTo === 'cancelled') {
            setSelectedTab('canceled');
            await Promise.all([fetchPatientsData(), fetchAppointmentsData()]);
          }
        } else {
          toast({
            title: "Success",
            description: "Marked as no-show successfully",
          });
          await Promise.all([fetchPatientsData(), fetchAppointmentsData()]);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark as no-show');
      }
    } catch (error) {
      console.error('Error marking as no-show:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to mark as no-show",
        variant: "destructive",
      });
    }
  };

  // Handle view patient onboarding
  const handleViewOnboarding = async (patientId: string, patientName: string) => {
    try {
      const response = await fetch(`/api/therapist/patients/${patientId}/onboarding`);
      if (response.ok) {
        const data = await response.json();
        setSelectedPatientOnboarding({ ...data, patientName });
        setShowOnboardingDialog(true);
      } else {
        throw new Error('Failed to fetch onboarding data');
      }
    } catch (error) {
      console.error('Error fetching onboarding:', error);
      toast({
        title: "Error",
        description: "Failed to load patient onboarding information",
        variant: "destructive",
      });
    }
  };

  // Handle cancel unpaid appointment
  const handleCancelUnpaidAppointment = async (appointmentId: string) => {
    try {
      const response = await fetch(`/api/therapist/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', reason: 'Cancelled by therapist - unpaid session' })
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Unpaid appointment cancelled successfully",
        });
        fetchPatientsData();
        fetchAppointmentsData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Error cancelling unpaid appointment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel appointment",
        variant: "destructive",
      });
    }
  };

  // Toggle package expansion (similar to patient dashboard)
  const togglePackageExpansion = (packageId: string) => {
    const newExpanded = new Set(expandedPackages);
    if (newExpanded.has(packageId)) {
      newExpanded.delete(packageId);
    } else {
      newExpanded.add(packageId);
    }
    setExpandedPackages(newExpanded);
  };

  // Toggle subscription expansion
  const toggleSubscriptionExpansion = (patientId: string) => {
    const newExpanded = new Set(expandedSubscriptions);
    if (newExpanded.has(patientId)) {
      newExpanded.delete(patientId);
    } else {
      newExpanded.add(patientId);
    }
    setExpandedSubscriptions(newExpanded);
  };

  // Get session display name (similar to patient dashboard)
  const getSessionDisplayName = (sessionIndex: number, totalSessions: number): string => {
    if (sessionIndex === 0) {
      return "Main Session";
    } else {
      return `Session ${sessionIndex + 1}`;
    }
  };

  // Get upcoming sessions for a package
  const getUpcomingSessions = (appointment: AppointmentData): string[] => {
    const sessions = [appointment.date];
    if (appointment.recurring && Array.isArray(appointment.recurring)) {
      appointment.recurring.forEach((session: any) => {
        if (session.date) {
          sessions.push(session.date);
        }
      });
    }
    return sessions;
  };

  // Get upcoming sessions count
  const getUpcomingSessionsCount = (appointment: AppointmentData): number => {
    const now = new Date();
    const sessions = getUpcomingSessions(appointment);
    return sessions.filter(sessionDate => new Date(sessionDate) > now).length;
  };

  // Handle appointment selection for bulk operations
  const handleAppointmentSelection = (appointmentId: string) => {
    const newSelected = new Set(selectedAppointments);
    if (newSelected.has(appointmentId)) {
      newSelected.delete(appointmentId);
    } else {
      newSelected.add(appointmentId);
    }
    setSelectedAppointments(newSelected);
  };

  // Handle select all appointments
  const handleSelectAll = (appointments: AppointmentData[]) => {
    const allIds = appointments.map(apt => apt._id);
    setSelectedAppointments(new Set(allIds));
  };

  // Handle deselect all appointments
  const handleDeselectAll = () => {
    setSelectedAppointments(new Set());
  };

  // Filter appointments based on selected patient
  const getFilteredAppointments = () => {
    if (!selectedPatientId) return appointmentsData;
    return appointmentsData.filter(apt => apt.patient._id === selectedPatientId);
  };

  // Categorize filtered appointments with proper date filtering
  const filteredAppointments = getFilteredAppointments();
  const now = new Date();
  
  const upcomingAppointments = filteredAppointments.filter(apt => {
    const appointmentDate = new Date(apt.date);
    return (apt.status === 'confirmed' || apt.status === 'rescheduled') && 
           appointmentDate > now;
  });
  const unpaidAppointments = filteredAppointments.filter(apt => {
    const appointmentDate = new Date(apt.date);
    return apt.status === 'unpaid' && appointmentDate > now;
  });
  const pendingValidationAppointments = filteredAppointments.filter(apt => {
    if (apt.status !== 'completed') return false;
    
    // Exclude appointments that are already paid (from previous validation system)
    if (apt.therapistPaid) return false;
    
    // Show only appointments that haven't been validated by therapist yet
    if (apt.therapistValidated) {
      console.log('Filtering out validated appointment:', {
        id: apt._id,
        therapistValidated: apt.therapistValidated,
        status: apt.status,
        therapistPaid: apt.therapistPaid
      });
      return false;
    }
    
    // For unpaid appointments, only show if they're in the future
    if (!apt.isStripeVerified) {
      const appointmentDate = new Date(apt.date);
      return appointmentDate > now;
    }
    
    // Show all paid appointments (ready for validation)
    return true;
  });
  const completedAppointments = filteredAppointments.filter(apt => {
    const isCompleted = (apt.status === 'completed' && apt.therapistValidated && !apt.therapistPaid) || apt.therapistPaid === true;
    if (apt.status === 'completed' && apt.therapistValidated) {
      console.log('Completed appointment found:', {
        id: apt._id,
        status: apt.status,
        therapistValidated: apt.therapistValidated,
        therapistPaid: apt.therapistPaid,
        willShowInCompleted: isCompleted
      });
    }
    return isCompleted;
  });
  const canceledAppointments = filteredAppointments.filter(apt => 
    apt.status === 'cancelled' || apt.status === 'no-show'
  );

  // Subscription display component
  const SubscriptionDisplay = ({ patientId }: { patientId: string }) => {
    const subscriptionData = patientSubscriptions[patientId];
    const isLoading = subscriptionLoading[patientId];
    const isExpanded = expandedSubscriptions.has(patientId);

    if (isLoading) {
      return (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm text-gray-600">Loading subscription info...</span>
          </div>
        </div>
      );
    }

    if (!subscriptionData) {
      return (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">No subscription data available</span>
          </div>
        </div>
      );
    }

    const { balance, subscriptions, summary } = subscriptionData;
    const hasActiveSubscriptions = summary.hasActiveSubscriptions;
    const hasBalance = balance.balanceInAED > 0;

    // If no balance and no subscriptions, show a simple message
    if (!hasBalance && !hasActiveSubscriptions) {
      return (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">No active subscriptions or session balance</span>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-3 space-y-3">
        {/* Session Balance Section */}
        {hasBalance && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-medium text-green-900">Session Balance</p>
                  <p className="text-xs text-green-700">
                    {balance.balanceInAED.toFixed(2)} AED remaining
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-900">
                  {balance.balanceInAED.toFixed(2)} AED
                </p>
                <p className="text-xs text-green-600">
                  {balance.remainingSessions.toFixed(1)} sessions
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Section */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          {/* Subscription Summary */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  {summary.totalActive > 0 
                    ? `${summary.totalActive} Active Subscription${summary.totalActive > 1 ? 's' : ''}`
                    : 'No Active Subscriptions'
                  }
                </p>
                {summary.totalActive > 0 && (
                  <p className="text-xs text-blue-700">
                    {summary.totalMonthlyValue.toFixed(2)} AED/month total
                  </p>
                )}
              </div>
            </div>
            
            {summary.nextRenewal && (
              <div className="text-right">
                <p className="text-xs text-blue-600">
                  {summary.nextRenewal ? `Renews on ${format(new Date(summary.nextRenewal), 'MMM dd, yyyy')}` : ''}
                </p>
              </div>
            )}
          </div>

        {/* Expandable Details - Only show if there are active subscriptions to expand */}
        {hasActiveSubscriptions && (
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSubscriptionExpansion(patientId)}
              className="w-full text-blue-600 border-blue-200 hover:bg-blue-100"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  View Details
                </>
              )}
            </Button>

            {isExpanded && (
              <div className="mt-3">
                {/* Active Subscriptions Details */}
                {hasActiveSubscriptions && (
                  <div className="p-3 bg-white rounded-lg border">
                    <h5 className="font-medium text-gray-800 mb-2">Subscription Details</h5>
                    <div className="space-y-2">
                      {subscriptions.map((sub) => (
                        <div key={sub._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{sub.productName}</p>
                            <p className="text-xs text-gray-600">
                              {sub.price.toFixed(2)} AED/month • {sub.status}
                            </p>
                            {sub.productDescription && (
                              <p className="text-xs text-gray-500 mt-1">{sub.productDescription}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-600">
                              {format(new Date(sub.currentPeriodEnd), 'MMM dd, yyyy')}
                            </p>
                            {sub.cancelAtPeriodEnd && (
                              <p className="text-xs text-red-600">Cancelling</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading patient data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-600">
        <AlertCircle className="w-8 h-8 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Patient Management Tabs */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Patient Management</h3>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Active:</strong> Has subscription OR balance OR upcoming session • 
              <strong> Inactive:</strong> No subscription AND no balance AND no upcoming session
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span>Badges:</span>
              <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-200">Sub</Badge>
              <span>= Subscription</span>
              <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-200">Balance</Badge>
              <span>= Session Balance</span>
              <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-200">Session</Badge>
              <span>= Upcoming Session</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Refresh subscription data for all patients
                const allPatientIds = [
                  ...patientsData.allPatients.map(p => p._id),
                  ...patientsData.activePatients.map(p => p._id),
                  ...patientsData.inactivePatients.map(p => p._id)
                ];
                const uniquePatientIds = [...new Set(allPatientIds)];
                uniquePatientIds.forEach(patientId => {
                  fetchPatientSubscriptionData(patientId);
                });
              }}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Subscriptions
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                console.log('Manual refresh triggered...');
                await Promise.all([fetchPatientsData(), fetchAppointmentsData()]);
                console.log('Manual refresh completed');
                toast({
                  title: "Data Refreshed",
                  description: "Appointment data has been refreshed from the server.",
                });
              }}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh All Data
            </Button>
          </div>
        </div>

        {/* Patient View Tabs */}
        <Tabs value={selectedPatientView} onValueChange={(value) => setSelectedPatientView(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Patients ({patientsData.allPatients.length})</TabsTrigger>
            <TabsTrigger value="active">Active Patients ({patientsData.activePatients.length})</TabsTrigger>
            <TabsTrigger value="inactive">Inactive Patients ({patientsData.inactivePatients.length})</TabsTrigger>
          </TabsList>

          {/* All Patients Tab */}
          <TabsContent value="all" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patientsData.allPatients.map((patient) => (
                <Card 
                  key={patient._id} 
                  className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${
                    selectedPatientId === patient._id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => handlePatientClick(patient)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={patient.image} />
                      <AvatarFallback>{patient.fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{patient.fullName}</h4>
                      <p className="text-sm text-gray-500">{patient.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={patient.hasActiveSubscriptions || patient.hasPositiveBalance || patient.hasUpcomingSession ? "default" : "secondary"}>
                          {patient.hasActiveSubscriptions || patient.hasPositiveBalance || patient.hasUpcomingSession ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">
                          {patient.totalSessions} sessions
                        </Badge>
                        {/* Show active criteria indicators */}
                        <div className="flex items-center gap-1">
                          {patient.hasActiveSubscriptions && (
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                              Sub
                            </Badge>
                          )}
                          {patient.hasPositiveBalance && (
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-200">
                              Balance
                            </Badge>
                          )}
                          {patient.hasUpcomingSession && (
                            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                              Session
                            </Badge>
                          )}
                        </div>
                      </div>
                      {patient.nextAppointment && (
                        <p className="text-xs text-green-600 mt-1 font-medium">
                          Next: {format(new Date(patient.nextAppointment), 'MMM dd, yyyy')}
                        </p>
                      )}
                      {patient.lastAppointment && !patient.nextAppointment && (
                        <p className="text-xs text-gray-500 mt-1">
                          Last: {format(new Date(patient.lastAppointment), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                    <Eye className="w-4 h-4 text-gray-400" />
                  </div>
                  
                  {/* Subscription Information */}
                  <SubscriptionDisplay patientId={patient._id} />
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Active Patients Tab */}
          <TabsContent value="active" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patientsData.activePatients.map((patient) => (
                <Card 
                  key={patient._id} 
                  className={`p-4 border-green-200 bg-green-50 hover:shadow-md transition-shadow cursor-pointer ${
                    selectedPatientId === patient._id ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => handlePatientClick(patient)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={patient.image} />
                      <AvatarFallback>{patient.fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{patient.fullName}</h4>
                      <p className="text-sm text-gray-500">{patient.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="default">Active</Badge>
                        <Badge variant="outline">
                          {patient.totalSessions} sessions
                        </Badge>
                        {/* Show active criteria indicators */}
                        <div className="flex items-center gap-1">
                          {patient.hasActiveSubscriptions && (
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                              Sub
                            </Badge>
                          )}
                          {patient.hasPositiveBalance && (
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-200">
                              Balance
                            </Badge>
                          )}
                          {patient.hasUpcomingSession && (
                            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                              Session
                            </Badge>
                          )}
                        </div>
                      </div>
                      {patient.nextAppointment && (
                        <p className="text-xs text-green-600 mt-1 font-medium">
                          Next: {format(new Date(patient.nextAppointment), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                    <Eye className="w-4 h-4 text-gray-400" />
                  </div>
                  
                  {/* Subscription Information */}
                  <SubscriptionDisplay patientId={patient._id} />
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Inactive Patients Tab */}
          <TabsContent value="inactive" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patientsData.inactivePatients.map((patient) => (
                <Card 
                  key={patient._id} 
                  className={`p-4 border-gray-200 bg-gray-50 hover:shadow-md transition-shadow cursor-pointer ${
                    selectedPatientId === patient._id ? 'ring-2 ring-gray-500' : ''
                  }`}
                  onClick={() => handlePatientClick(patient)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={patient.image} />
                      <AvatarFallback>{patient.fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{patient.fullName}</h4>
                      <p className="text-sm text-gray-500">{patient.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">Inactive</Badge>
                        <Badge variant="outline">
                          {patient.totalSessions} sessions
                        </Badge>
                        {/* Show why they're inactive */}
                        <div className="flex items-center gap-1">
                          {!patient.hasActiveSubscriptions && !patient.hasPositiveBalance && !patient.hasUpcomingSession && (
                            <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600 border-gray-200">
                              No Sub/Balance/Session
                            </Badge>
                          )}
                        </div>
                      </div>
                      {patient.lastAppointment && (
                        <p className="text-xs text-gray-500 mt-1">
                          Last: {format(new Date(patient.lastAppointment), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                    <Eye className="w-4 h-4 text-gray-400" />
                  </div>
                  
                  {/* Subscription Information */}
                  <SubscriptionDisplay patientId={patient._id} />
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Patient Appointments Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Patient Appointments
            {selectedPatientId && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                - {patientsData.allPatients.find(p => p._id === selectedPatientId)?.fullName}
              </span>
            )}
          </h3>
          {selectedPatientId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPatientId(null)}
            >
              Show All Patients
            </Button>
          )}
        </div>

        <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as any)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="appointments">Upcoming ({upcomingAppointments.length})</TabsTrigger>
            <TabsTrigger value="unpaid">Unpaid ({unpaidAppointments.length})</TabsTrigger>
            <TabsTrigger value="pendingValidation">Pending Validation ({pendingValidationAppointments.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedAppointments.length})</TabsTrigger>
            <TabsTrigger value="canceled">Canceled ({canceledAppointments.length})</TabsTrigger>
          </TabsList>

          {/* Upcoming Appointments */}
          <TabsContent value="appointments" className="space-y-4">
            {upcomingAppointments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No upcoming appointments</p>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <Card key={appointment._id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={appointment.patient.image} />
                          <AvatarFallback>{appointment.patient.fullName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium text-gray-900">{appointment.patient.fullName}</h4>
                          <p className="text-sm text-gray-500">{appointment.patient.email}</p>
                          <p className="text-xs text-gray-400">{appointment.patient.telephone}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-gray-500 flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {format(new Date(appointment.date), 'MMM dd, yyyy')}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {format(new Date(appointment.date), 'HH:mm')}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center">
                              <Globe className="w-3 h-3 mr-1" />
                              {appointment.patientTimezone}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewOnboarding(appointment.patient._id, appointment.patient.fullName)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Info
                        </Button>
                        <Badge variant={appointment.isRescheduled ? "secondary" : "default"}>
                          {appointment.status === 'confirmed' ? 'Confirmed' : 
                           appointment.status === 'rescheduled' ? 'Confirmed' : 
                           appointment.status}
                        </Badge>
                        <Badge variant={appointment.isStripeVerified ? "default" : "destructive"}>
                          {appointment.isStripeVerified 
                            ? (appointment.stripePaymentStatus === 'paid_by_balance' ? 'Paid by Balance' : 'Paid')
                            : 'Unpaid'
                          }
                        </Badge>
                        {appointment.meetingLink && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(appointment.meetingLink, '_blank')}
                          >
                            <Video className="w-4 h-4 mr-2" />
                            Join Meeting
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Enhanced Appointment Details */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-3">
                      {/* Plan and Price Info */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-gray-700">
                            {appointment.plan} ({appointment.planType})
                          </span>
                          <span className="text-sm text-gray-500">
                            {appointment.price} AED total | {appointment.sessionPrice.toFixed(2)} AED per session
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {appointment.completedSessions}/{appointment.totalSessions} sessions
                          </Badge>
                          {appointment.totalSessions > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => togglePackageExpansion(appointment._id)}
                              className="text-gray-600 border-gray-200 hover:bg-gray-50"
                            >
                              {expandedPackages.has(appointment._id) ? (
                                <>
                                  <ChevronUp className="w-4 h-4 mr-1" />
                                  Hide Sessions
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4 mr-1" />
                                  View Sessions ({getUpcomingSessionsCount(appointment)} upcoming)
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Meeting Link Input */}
                      <div>
                        <Label htmlFor={`meeting-link-${appointment._id}`} className="text-sm font-medium">
                          Meeting Link
                        </Label>
                        <div className="flex gap-2 mt-2">
                          <Input
                            id={`meeting-link-${appointment._id}`}
                            placeholder="Enter meeting link..."
                            value={meetingLinkInputs[appointment._id] || appointment.meetingLink || ''}
                            onChange={(e) => setMeetingLinkInputs(prev => ({
                              ...prev,
                              [appointment._id]: e.target.value
                            }))}
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              const link = meetingLinkInputs[appointment._id] || appointment.meetingLink || '';
                              if (link) {
                                handleMeetingLinkUpdate(appointment._id, link);
                              }
                            }}
                          >
                            Update
                          </Button>
                        </div>
                      </div>

                      {/* Expandable Sessions */}
                      {expandedPackages.has(appointment._id) && appointment.totalSessions > 1 && (
                        <div className="pt-4 border-t border-gray-200">
                          <h5 className="font-medium text-gray-800 mb-3">All Sessions</h5>
                          <div className="space-y-3">
                            {getUpcomingSessions(appointment).map((sessionDate: string, index: number) => {
                              const sessionName = getSessionDisplayName(index, appointment.totalSessions);
                              const isUpcoming = new Date(sessionDate) > new Date();
                              const isCompleted = index < appointment.completedSessions;
                              
                              return (
                                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                  <div className="flex items-center gap-3">
                                    <span className="text-lg">
                                      {isCompleted ? '✅' : isUpcoming ? '🟢' : '⏰'}
                                    </span>
                                    <div>
                                      <p className="font-medium text-gray-800">
                                        {sessionName} - {format(new Date(sessionDate), 'EEEE, MMMM d, yyyy')}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        at {format(new Date(sessionDate), 'h:mm a')}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      className={`text-xs ${
                                        isCompleted 
                                          ? 'bg-green-100 text-green-600' 
                                          : isUpcoming 
                                            ? 'bg-blue-100 text-blue-600' 
                                            : 'bg-gray-100 text-gray-600'
                                      }`}
                                    >
                                      {isCompleted ? 'Completed' : isUpcoming ? 'Upcoming' : 'Past'}
                                    </Badge>
                                    
                                    {/* Meeting Link for individual sessions */}
                                    {appointment.meetingLink && isUpcoming && (
                                      <Button 
                                        size="sm"
                                        variant="outline"
                                        onClick={() => window.open(appointment.meetingLink, '_blank')}
                                        className="h-7 px-2 text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                      >
                                        <Video className="w-3 h-3 mr-1" />
                                        Join
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Unpaid Appointments */}
          <TabsContent value="unpaid" className="space-y-4">
            {unpaidAppointments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No unpaid appointments</p>
            ) : (
              <div className="space-y-4">
                {unpaidAppointments.map((appointment) => (
                  <Card key={appointment._id} className="p-4 border-orange-200 bg-orange-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={appointment.patient.image} />
                          <AvatarFallback>{appointment.patient.fullName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium text-gray-900">{appointment.patient.fullName}</h4>
                          <p className="text-sm text-gray-500">{appointment.patient.email}</p>
                          <p className="text-xs text-gray-400">{appointment.patient.telephone}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-gray-500 flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {format(new Date(appointment.date), 'MMM dd, yyyy')}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {format(new Date(appointment.date), 'HH:mm')}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center">
                              <Globe className="w-3 h-3 mr-1" />
                              {appointment.patientTimezone}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewOnboarding(appointment.patient._id, appointment.patient.fullName)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Info
                        </Button>
                        <Badge variant={appointment.isRescheduled ? "secondary" : "default"}>
                          {appointment.status === 'confirmed' ? 'Confirmed' : 
                           appointment.status === 'rescheduled' ? 'Confirmed' : 
                           appointment.status}
                        </Badge>
                        <Badge variant="destructive">Unpaid</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelUnpaidAppointment(appointment._id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                    
                    {/* Unpaid Appointment Details */}
                    <div className="mt-4 p-3 bg-white rounded-lg border space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-gray-700">
                            {appointment.plan} ({appointment.planType})
                          </span>
                          <span className="text-sm text-gray-500">
                            {appointment.price} AED total | {appointment.sessionPrice.toFixed(2)} AED per session
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {appointment.completedSessions}/{appointment.totalSessions} sessions
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm text-yellow-800 font-medium">
                            This appointment will expire when the scheduled time arrives
                          </span>
                        </div>
                        <p className="text-xs text-yellow-700 mt-1">
                          Patient needs to complete payment before the session time to secure this slot.
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Pending Validation Appointments */}
          <TabsContent value="pendingValidation" className="space-y-4">
            {pendingValidationAppointments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No appointments pending validation</p>
            ) : (
              <div className="space-y-4">
                {/* Bulk Actions Header */}
                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedAppointments.size === pendingValidationAppointments.length && pendingValidationAppointments.length > 0}
                        onChange={() => {
                          if (selectedAppointments.size === pendingValidationAppointments.length) {
                            handleDeselectAll();
                          } else {
                            handleSelectAll(pendingValidationAppointments);
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Select All ({selectedAppointments.size}/{pendingValidationAppointments.length})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedAppointments.size > 0 && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            const selectedIds = Array.from(selectedAppointments);
                            const paidAppointments = selectedIds.filter(id => {
                              const apt = pendingValidationAppointments.find(a => a._id === id);
                              return apt?.isStripeVerified;
                            });
                            if (paidAppointments.length > 0) {
                              handleValidateMultiplePayments(paidAppointments);
                              handleDeselectAll();
                            } else {
                              toast({
                                title: "No Valid Sessions",
                                description: "Please select only paid appointments for validation.",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Validate Selected Sessions ({selectedAppointments.size})
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDeselectAll}
                        >
                          Clear Selection
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {pendingValidationAppointments.map((appointment) => (
                  <Card key={appointment._id} className={`p-4 border-yellow-200 bg-yellow-50 ${selectedAppointments.has(appointment._id) ? 'ring-2 ring-blue-500' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedAppointments.has(appointment._id)}
                          onChange={() => handleAppointmentSelection(appointment._id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <Avatar>
                          <AvatarImage src={appointment.patient.image} />
                          <AvatarFallback>{appointment.patient.fullName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium text-gray-900">{appointment.patient.fullName}</h4>
                          <p className="text-sm text-gray-500">{appointment.patient.email}</p>
                          <p className="text-xs text-gray-400">{appointment.patient.telephone}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-gray-500 flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {format(new Date(appointment.date), 'MMM dd, yyyy')}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {format(new Date(appointment.date), 'HH:mm')}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center">
                              <Globe className="w-3 h-3 mr-1" />
                              {appointment.patientTimezone}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Completed</Badge>
                        <Badge variant={appointment.isStripeVerified ? "default" : "destructive"}>
                          {appointment.isStripeVerified 
                            ? (appointment.stripePaymentStatus === 'paid_by_balance' ? 'Paid by Balance' : 'Paid')
                            : 'Unpaid'
                          }
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Enhanced Payment Validation Details */}
                    <div className="mt-4 p-3 bg-white rounded-lg border space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-gray-700">
                            {appointment.plan} ({appointment.planType})
                          </span>
                          <span className="text-sm text-gray-500">
                            {appointment.price} AED total
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-green-600">
                            Payout: {appointment.sessionPrice.toFixed(2)} AED
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Payment Status: {appointment.stripePaymentStatus === 'paid_by_balance' ? 'Paid by Balance' : appointment.stripePaymentStatus}
                        </span>
                        <span className="text-sm text-gray-600">
                          Payout Status: {appointment.payoutStatus}
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleValidatePayment(appointment._id)}
                          disabled={!appointment.isStripeVerified}
                          className="flex-1"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Validate Session
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkNoShow(appointment._id)}
                          className="flex-1"
                        >
                          Mark No-Show
                        </Button>
                      </div>
                      
                      {!appointment.isStripeVerified && (
                        <p className="text-xs text-red-600">
                          ⚠️ Payment not verified. Cannot validate until payment is confirmed.
                        </p>
                      )}
                      
                      {/* Bank-like Status Information */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-500 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Status:</span>
                            <span className={appointment.therapistValidated ? "text-red-600 font-medium" : ""}>
                              {appointment.therapistValidated 
                                ? "⚠️ Session validated - Should be in Completed section (Data sync issue!)" 
                                : "Completed session - Awaiting therapist validation"
                              }
                            </span>
                          </div>
                          {appointment.lastStatusChangeReason && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Last Action:</span>
                              <span>{appointment.lastStatusChangeReason}</span>
                            </div>
                          )}
                          {appointment.lastStatusChangedAt && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Last Updated:</span>
                              <span>{format(new Date(appointment.lastStatusChangedAt), 'MMM dd, yyyy HH:mm')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {appointment.stripePaymentStatus === 'paid_by_balance' && (
                        <p className="text-xs text-green-600">
                          ✅ Payment verified via session balance.
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Completed Appointments */}
          <TabsContent value="completed" className="space-y-4">
            {completedAppointments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No completed appointments</p>
            ) : (
              <div className="space-y-4">
                {completedAppointments.map((appointment) => (
                  <Card key={appointment._id} className={`p-4 ${
                    appointment.therapistPaid 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-orange-200 bg-orange-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={appointment.patient.image} />
                          <AvatarFallback>{appointment.patient.fullName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium text-gray-900">{appointment.patient.fullName}</h4>
                          <p className="text-sm text-gray-500">{appointment.patient.email}</p>
                          <p className="text-xs text-gray-400">{appointment.patient.telephone}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-gray-500 flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {format(new Date(appointment.date), 'MMM dd, yyyy')}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {format(new Date(appointment.date), 'HH:mm')}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center">
                              <Globe className="w-3 h-3 mr-1" />
                              {appointment.patientTimezone}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Validated</Badge>
                        {appointment.therapistPaid ? (
                          <Badge variant="default">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Paid
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="w-3 h-3 mr-1" />
                            Upcoming Payment
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Payment Details */}
                    <div className="mt-4 p-3 bg-white rounded-lg border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Payment: {appointment.sessionPrice.toFixed(2)} AED
                          {appointment.therapistPaid ? ' processed' : ' pending'}
                        </span>
                        {appointment.therapistPaid ? (
                          <span className="text-sm text-green-600 font-medium">
                            ✅ Validated & Paid
                          </span>
                        ) : (
                          <span className="text-sm text-orange-600 font-medium">
                            ⏳ Validated - Awaiting Payment
                          </span>
                        )}
                      </div>
                      
                      {/* Bank-like Status Information */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-500 space-y-1">
                          {appointment.validationReason && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Validation:</span>
                              <span>{appointment.validationReason}</span>
                            </div>
                          )}
                          {appointment.paymentStatusReason && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Payment Status:</span>
                              <span>{appointment.paymentStatusReason}</span>
                            </div>
                          )}
                          {appointment.lastStatusChangeReason && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Last Action:</span>
                              <span>{appointment.lastStatusChangeReason}</span>
                            </div>
                          )}
                          {appointment.therapistValidatedAt && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Validated:</span>
                              <span>{format(new Date(appointment.therapistValidatedAt), 'MMM dd, yyyy HH:mm')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Canceled Appointments */}
          <TabsContent value="canceled" className="space-y-4">
            {canceledAppointments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No canceled appointments</p>
            ) : (
              <div className="space-y-4">
                {canceledAppointments.map((appointment) => (
                  <Card key={appointment._id} className="p-4 border-red-200 bg-red-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={appointment.patient.image} />
                          <AvatarFallback>{appointment.patient.fullName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium text-gray-900">{appointment.patient.fullName}</h4>
                          <p className="text-sm text-gray-500">{appointment.patient.email}</p>
                          <p className="text-xs text-gray-400">{appointment.patient.telephone}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-gray-500 flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {format(new Date(appointment.date), 'MMM dd, yyyy')}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {format(new Date(appointment.date), 'HH:mm')}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center">
                              <Globe className="w-3 h-3 mr-1" />
                              {appointment.patientTimezone}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">
                          {appointment.status === 'no-show' ? 'No-Show' : 
                           appointment.status === 'cancelled' ? 'Canceled' : appointment.status}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Cancellation Details */}
                    {appointment.reason && (
                      <div className="mt-4 p-3 bg-white rounded-lg border">
                        <p className="text-sm text-gray-600">
                          <strong>Reason:</strong> {appointment.reason}
                        </p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      {/* Patient Onboarding Dialog */}
      <Dialog open={showOnboardingDialog} onOpenChange={setShowOnboardingDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center">
              <Eye className="mr-2 h-5 w-5 text-blue-600" />
              Patient Onboarding Information - {selectedPatientOnboarding?.patientName}
            </DialogTitle>
          </DialogHeader>

          {selectedPatientOnboarding?.responses && selectedPatientOnboarding.responses.length > 0 ? (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                {selectedPatientOnboarding.responses.map((response: any, index: number) => (
                  <div key={index} className="pb-4 border-b border-gray-200 last:border-0">
                    <h3 className="font-medium text-gray-900 mb-2">{response.question}</h3>
                    {Array.isArray(response.answer) ? (
                      <ul className="list-disc list-inside space-y-1">
                        {response.answer.map((item: any, i: number) => (
                          <li key={i} className="text-gray-600">{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-600">
                        {typeof response.answer === 'boolean'
                          ? response.answer ? 'Yes' : 'No'
                          : response.answer}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-6">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Onboarding Information</h3>
              <p className="text-gray-600 mt-2">
                This patient has not completed the onboarding process yet.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
