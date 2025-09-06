"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, isBefore, isPast, addHours } from "date-fns";
import { 
  Loader2,
  CheckCircle,
  User,
  Calendar,
  Phone,
  XCircle,
  CalendarPlus,
  AlertCircle,
  Video,
  MoreVertical,
  Copy,
  Clock,
  ChevronUp,
  ChevronDown,
  CreditCard,
  MessageCircle
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ChatButton from "@/components/shared/ChatButton";
import ChatWindow from "@/components/shared/ChatWindow";
import RescheduleDialog from "./RescheduleDialog";
import CancellationDialog from "./CancellationDialog";
import BookAppointment from "@/app/book-appointment/page";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AppointmentWidget from "./AppointmentWidget";
import { AppointmentNextStepWidget } from "./AppointmentNextStepWidget";

// Safe data validation functions
const safeString = (value: any, defaultValue: string = ''): string => {
  return typeof value === 'string' ? value : defaultValue;
};

const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

const safeBoolean = (value: any, defaultValue: boolean = false): boolean => {
  if (typeof value === 'boolean') return value;
  return Boolean(value);
};

const safeArray = (value: any): any[] => {
  return Array.isArray(value) ? value : [];
};

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  try {
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

interface Appointment {
  _id: string;
  id: string;
  date: string;
  status: string;
  customStatus?: string;
  therapist: {
    id: string;
    name: string;
    image: string;
    specialties?: string[];
    summary?: string;
    phone?: string;
  } | null;
  meetingLink?: string;
  declineComment?: string;
  reason?: string;
  isStripeVerified?: boolean;
  isBalance?: boolean | null;
  therapyType: string;
  plan: string;
  price: number;
  recurring: any[];
  paidAt?: string;
  paymentHistory?: Array<{
    amount: number;
    currency: string;
    status: string;
    paymentMethod: string;
    stripeSessionId?: string;
    stripePaymentIntentId?: string;
    createdAt: string;
  }>;
}

const AppointmentStatusView = () => {
  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [rescheduleWithin24Hours, setRescheduleWithin24Hours] = useState(false);
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set());
  const [selectedSessionIndex, setSelectedSessionIndex] = useState<number | null>(null);
  const [activeChatConversation, setActiveChatConversation] = useState<string | null>(null);
  const [activeChatTherapist, setActiveChatTherapist] = useState<{id: string, name: string} | null>(null);
  const { data: session, update: updateUserSession } = useSession();
  const router = useRouter();

  const fetchStatusData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/patient/dashboard/status');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setStatusData(data);
    } catch (err) {
      console.error('Error fetching status data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch status data');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshStatusData = useCallback(async () => {
    try {
      await fetchStatusData();
    } catch (err: any) {
      setError(safeString(err?.message, "An unknown error occurred"));
      throw err;
    }
  }, [fetchStatusData]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await refreshStatusData();
      } catch (err: any) {
        setError(safeString(err?.message, "An unknown error occurred"));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [refreshStatusData]);

  const isWithin24Hours = (appointmentDate: string): boolean => {
    const appointmentDateObj = safeParseDate(appointmentDate);
    if (!appointmentDateObj) return false;
    
    const now = new Date();
    const twentyFourHoursBefore = addHours(appointmentDateObj, -24);
    return !isBefore(now, twentyFourHoursBefore);
  };

  const isAppointmentExpired = (appointmentDate: string): boolean => {
    const appointmentDateObj = safeParseDate(appointmentDate);
    if (!appointmentDateObj) return false;
    return isPast(appointmentDateObj);
  };

  const canJoinMeeting = (appointmentDate: string): boolean => {
    const appointmentDateObj = safeParseDate(appointmentDate);
    if (!appointmentDateObj) return false;
    
    const now = new Date();
    const twoHoursBefore = addHours(appointmentDateObj, -2);
    return !isBefore(now, twoHoursBefore);
  };

  const handleCancellation = async (appointmentId: string, charge: boolean) => {
    try {
      const response = await fetch("/api/patient/appointments/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, charge, reduceSession: charge ? 0.5 : 0 }),
      });

      if (!response.ok) throw new Error("Failed to cancel appointment");
      
      await refreshStatusData();
      toast.success("Appointment cancelled successfully");
      
      // Refresh the whole page after successful cancellation
      window.location.reload();
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast.error("Failed to cancel appointment");
    }
  };

  const handleRescheduleSuccess = async () => {
    try {
      await refreshStatusData();
      const sessionName = selectedSessionIndex !== null ? getSessionDisplayName(selectedSessionIndex, selectedAppointment?.recurring?.length || 0) : "appointment";
      toast.success(
        rescheduleWithin24Hours 
          ? `${sessionName} rescheduled successfully. One session has been deducted.`
          : `${sessionName} rescheduled and confirmed successfully.`
      );
      setRescheduleWithin24Hours(false);
      setSelectedSessionIndex(null);
      
      // Refresh the whole page after successful reschedule to sync both tabs
      window.location.reload();
    } catch (error) {
      console.error("Error refreshing appointment status:", error);
    }
  };

  const handleJoinMeeting = (meetingLink: string) => {
    if (typeof meetingLink === 'string' && meetingLink.includes('/')) {
      const meetingCode = meetingLink.split("/").pop();
      if (meetingCode) {
        router.push(`/video-call/${meetingCode}`);
      } else {
        window.open(meetingLink, "_blank");
      }
    } else {
      toast.error("Invalid meeting link");
    }
  };

  // Toggle package expansion
  const togglePackageExpansion = (packageId: string) => {
    const newExpanded = new Set(expandedPackages);
    if (newExpanded.has(packageId)) {
      newExpanded.delete(packageId);
    } else {
      newExpanded.add(packageId);
    }
    setExpandedPackages(newExpanded);
  };

  // Handle package cancellation
  const handlePackageCancellation = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowCancellationDialog(true);
  };

  // Handle package rescheduling (first session only)
  const handlePackageReschedule = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleWithin24Hours(false);
    setSelectedSessionIndex(0); // Always reschedule first session
    setShowRescheduleDialog(true);
  };

  // Handle individual session rescheduling
  const handleSessionReschedule = (appointment: Appointment, sessionIndex: number) => {
    setSelectedAppointment(appointment);
    setRescheduleWithin24Hours(true);
    setSelectedSessionIndex(sessionIndex);
    setShowRescheduleDialog(true);
  };

  // Handle starting a chat with therapist
  const handleChatWithTherapist = (therapist: {id: string, name: string}) => {
    setActiveChatTherapist(therapist);
    // Generate conversation ID (sorted to match backend)
    const participants = [session?.user?.id, therapist.id].sort();
    setActiveChatConversation(participants.join('_'));
  };

  // Get the correct session date based on index
  const getSessionDateByIndex = (appointment: Appointment, sessionIndex: number): string => {
    if (sessionIndex === 0) {
      return appointment.date; // Main appointment date
    } else if (appointment.recurring && Array.isArray(appointment.recurring)) {
      // Adjust index for recurring sessions (they start from 0, but we want 1,2,3...)
      const recurringIndex = sessionIndex - 1;
      if (recurringIndex >= 0 && recurringIndex < appointment.recurring.length) {
        return appointment.recurring[recurringIndex].date;
      }
    }
    return appointment.date; // Fallback
  };

  // Get session display name
  const getSessionDisplayName = (sessionIndex: number, totalSessions: number): string => {
    if (sessionIndex === 0) {
      return "Main Session";
    } else {
      return `Session ${sessionIndex + 1}`;
    }
  };

  // Get session status display info - REMOVED "Past" status as it's redundant
  const getSessionStatusInfo = (sessionDate: string, isCompleted: boolean = false) => {
    const date = new Date(sessionDate);
    const now = new Date();
    
    if (isCompleted) {
      return {
        text: 'Completed',
        color: 'text-green-600',
        bg: 'bg-green-100',
        icon: '✅'
      };
    }
    
    // Only show Upcoming and Completed - remove "Past" as it duplicates completed functionality
    return {
      text: 'Upcoming',
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      icon: '🟢'
    };
  };

  // Get upcoming sessions count (excluding past/completed)
  const getUpcomingSessionsCount = (appointment: Appointment): number => {
    if (!appointment.recurring || !Array.isArray(appointment.recurring)) {
      return 1; // Just the main appointment
    }
    
    const now = new Date();
    let count = 0;
    
    // Check main appointment
    if (new Date(appointment.date) > now) {
      count++;
    }
    
    // Check recurring sessions
    appointment.recurring.forEach((session: any) => {
      if (new Date(session.date) > now) {
        count++;
      }
    });
    
    return count;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Get the current appointment (closest upcoming) for backward compatibility
  const currentAppointment = statusData?.closestUpcoming || statusData?.appointments?.[0] || null;
  
  // Get all active appointments and separate paid vs unpaid
  const allAppointments = statusData?.appointments || [];
  const paidAppointments = allAppointments.filter((apt: Appointment) => 
    (apt.isStripeVerified || apt.isBalance) && 
    apt.status !== 'unpaid' && 
    apt.status !== 'cancelled' && 
    apt.status !== 'completed'
  );
  const unpaidAppointments = allAppointments.filter((apt: Appointment) => 
    apt.status === 'unpaid' || 
    (!apt.isStripeVerified && !apt.isBalance && apt.paymentStatus !== 'completed')
  );

  if (!statusData || allAppointments.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="p-6">
          <div className="text-center py-8">
            <CalendarPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Packages</h3>
            <p className="text-gray-500 mb-4">You don't have any active therapy packages yet.</p>
            <Button onClick={() => setShowBookDialog(true)}>
              Book Your First Session
      </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Permanent Meeting Link Bar - Always visible */}
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🎥</div>
              <h4 className="font-medium text-gray-800">Meeting Links</h4>
            </div>
            
            {(() => {
              // Find ALL appointments with meeting links (not just the nearest one)
              const appointmentsWithLinks = allAppointments.filter((apt: Appointment) => 
                apt.meetingLink && 
                (apt.status === 'confirmed' || apt.customStatus === 'upcoming') &&
                new Date(apt.date) > new Date()
              );
              
              if (appointmentsWithLinks.length > 0) {
                return (
                  <div className="space-y-2">
                    {appointmentsWithLinks.map((apt, index) => (
                      <div key={apt.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100">
                        <div className="flex items-center gap-3">
                          <div className="text-lg">
                            {apt.therapyType === 'individual' ? '🧑' :
                             apt.therapyType === 'couples' ? '👫' : '🧒'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{apt.plan}</p>
                            <p className="text-sm text-gray-600">
                              Next session: {format(new Date(apt.date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        
                        <Button
                          onClick={() => handleJoinMeeting(apt.meetingLink!)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Join Meeting
                        </Button>
                      </div>
                    ))}
                  </div>
                );
              } else {
                return (
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="text-lg">⏳</div>
                      <div>
                        <p className="font-medium text-gray-800">No Meeting Links Available</p>
                        <p className="text-sm text-gray-600">
                          Waiting for therapist to add meeting links...
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      disabled
                      variant="outline"
                      className="text-gray-400 border-gray-300 cursor-not-allowed"
                    >
                      <Video className="w-4 h-4 mr-2" />
                      No Link Available
                    </Button>
                  </div>
                );
              }
            })()}
          </div>
        </Card>

        {/* Payment Required Section */}
        {unpaidAppointments.length > 0 && (
          <Card className="p-6 border-orange-200 bg-orange-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-orange-900">Payment Required</h3>
              </div>
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                {unpaidAppointments.length} unpaid
              </Badge>
            </div>
            
            <div className="space-y-4">
              {unpaidAppointments.map((appointment: Appointment) => {
                const hasRecurringSessions = appointment.recurring && Array.isArray(appointment.recurring) && appointment.recurring.length > 0;
                const totalSessions = hasRecurringSessions ? appointment.recurring.length + 1 : 1;

                return (
                  <div key={appointment.id} className="bg-white rounded-lg shadow-sm border border-orange-200 p-4">
                    {/* Package Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {appointment.therapyType === 'individual' ? '🧑' :
                           appointment.therapyType === 'couples' ? '👫' : '🧒'}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800">{appointment.plan}</h4>
                          <p className="text-sm text-gray-600">
                            {appointment.therapyType === 'individual' ? 'Individual Therapy' :
                             appointment.therapyType === 'couples' ? 'Couples Therapy' : 'Kids Therapy'}
                          </p>
                        </div>
                      </div>

                      <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                        Payment Required
                      </Badge>
                    </div>

                    {/* Package Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-gray-600">Appointment Date</p>
                          <p className="font-medium">
                            {format(new Date(appointment.date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-gray-600">Total Sessions</p>
                          <p className="font-medium">{totalSessions}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-gray-600">Amount Due</p>
                          <p className="font-medium text-orange-600">AED {appointment.price}</p>
                        </div>
                      </div>
                    </div>

                    {/* Therapist Info */}
                    {appointment.therapist && (
                      <div className="mb-4 pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            Therapist: {appointment.therapist.name}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Payment Action */}
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Complete payment to activate your package
                        </div>
                        <Button 
                          onClick={() => window.open(`/payment?appointmentId=${appointment.id}`, '_blank')}
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay Now
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Your Active Packages - Enhanced with controls */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Your Active Packages</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStatusData}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Loader2 className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          <div className="space-y-4">
            {paidAppointments.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Packages</h3>
                <p className="text-gray-600">
                  {unpaidAppointments.length > 0 
                    ? "Complete payment for your appointments above to activate them."
                    : "You don't have any active therapy packages at the moment."
                  }
                </p>
              </div>
            ) : (
              paidAppointments.map((appointment: Appointment) => {
                const isExpanded = expandedPackages.has(appointment.id);
                const hasRecurringSessions = appointment.recurring && Array.isArray(appointment.recurring) && appointment.recurring.length > 0;
                const totalSessions = hasRecurringSessions ? appointment.recurring.length + 1 : 1;
                const upcomingSessionsCount = getUpcomingSessionsCount(appointment);
                const upcomingSessions = hasRecurringSessions 
                  ? [appointment.date, ...appointment.recurring.map((s: any) => s.date)]
                  : [appointment.date];

                return (
                <div key={appointment.id} className="bg-white rounded-lg shadow-sm border border-blue-200 p-4">
                  {/* Package Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {appointment.therapyType === 'individual' ? '🧑' :
                         appointment.therapyType === 'couples' ? '👫' : '🧒'}
          </div>
                      <div>
                        <h4 className="font-medium text-gray-800">{appointment.plan}</h4>
                        <p className="text-sm text-gray-600">
                          {appointment.therapyType === 'individual' ? 'Individual Therapy' :
                           appointment.therapyType === 'couples' ? 'Couples Therapy' : 'Kids Therapy'}
                        </p>
                      </div>
        </div>

                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      Active
              </Badge>
          </div>

                  {/* Package Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-gray-600">Next Session</p>
                        <p className="font-medium">
                          {format(new Date(appointment.date), 'MMM d, yyyy')}
          </p>
        </div>
      </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-gray-600">Upcoming Sessions</p>
                        <p className="font-medium">{upcomingSessionsCount} of {totalSessions}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-gray-600">Price</p>
                        <p className="font-medium">AED {appointment.price}</p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Information */}
                  {(appointment.paidAt || appointment.paymentHistory) && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <h5 className="font-medium text-green-800">Payment Information</h5>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {appointment.paidAt && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-green-600" />
                            <div>
                              <p className="text-green-700">Paid At</p>
                              <p className="font-medium text-green-800">
                                {format(new Date(appointment.paidAt), 'MMM d, yyyy \'at\' h:mm a')}
                              </p>
                            </div>
                          </div>
                        )}
                        {appointment.paymentHistory && appointment.paymentHistory.length > 0 && (
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-green-600" />
                            <div>
                              <p className="text-green-700">Payment Method</p>
                              <p className="font-medium text-green-800 capitalize">
                                {appointment.paymentHistory[0].paymentMethod}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      {appointment.paymentHistory && appointment.paymentHistory.length > 0 && (
                        <div className="mt-2 text-xs text-green-600">
                          <p>Amount: {appointment.paymentHistory[0].amount} {appointment.paymentHistory[0].currency}</p>
                          {appointment.paymentHistory[0].stripeSessionId && (
                            <p>Stripe Session: {appointment.paymentHistory[0].stripeSessionId}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Therapist Info */}
                  {appointment.therapist && (
                    <div className="mb-4 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            Therapist: {appointment.therapist.name}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleChatWithTherapist({
                            id: appointment.therapist.id,
                            name: appointment.therapist.name
                          })}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Chat with your therapist
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="mb-4 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Status:</span>
                      <Badge variant="outline" className="text-xs">
                        {appointment.customStatus || appointment.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Time Scheduling for Pending Scheduling Status */}
                  {appointment.customStatus === 'pending_scheduling' && appointment.therapist && (
                    <div className="mb-4 pt-3 border-t border-gray-200">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="w-5 h-5 text-yellow-600" />
                          <h5 className="font-medium text-yellow-800">Schedule Your Appointment</h5>
                        </div>
                        <p className="text-sm text-yellow-700 mb-3">
                          Your therapist has accepted your appointment. Please select a convenient time for your session.
                        </p>
                        <Button
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setShowRescheduleDialog(true);
                          }}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Choose Time
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Meeting Link - Only for confirmed and upcoming appointments */}
                  {appointment.meetingLink && 
                   (appointment.status === 'confirmed' || 
                    appointment.customStatus === 'upcoming') && (
                    <div className="mb-4 pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-gray-600">Meeting Link:</span>
                        <Button
                          size="sm"
                          onClick={() => window.open(appointment.meetingLink, '_blank')}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Join Meeting
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Control Buttons */}
                  <div className="flex flex-wrap gap-2 mb-4 pt-3 border-t border-gray-200">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePackageReschedule(appointment)}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Reschedule First Session
                    </Button>
                    
        <Button
          variant="outline"
          size="sm"
                      onClick={() => handlePackageCancellation(appointment)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Cancel Package
        </Button>

                    {hasRecurringSessions && (
      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePackageExpansion(appointment.id)}
                        className="text-gray-600 border-gray-200 hover:bg-gray-50"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4 mr-1" />
                            Hide Sessions
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4 mr-1" />
                            View Sessions ({upcomingSessionsCount} upcoming)
                          </>
                        )}
      </Button>
      )}
    </div>

                  {/* Expandable Sessions */}
                  {isExpanded && hasRecurringSessions && (
                    <div className="pt-4 border-t border-gray-200">
                      <h5 className="font-medium text-gray-800 mb-3">All Sessions</h5>
                      <div className="space-y-3">
                        {upcomingSessions.map((sessionDate: string, index: number) => {
                          const sessionStatus = getSessionStatusInfo(sessionDate, index === 0 && appointment.status === 'completed');
                          const canReschedule = sessionStatus.text === 'Upcoming' && appointment.therapist?.id;
                          const sessionName = getSessionDisplayName(index, totalSessions);
                          
                          return (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <span className="text-lg">{sessionStatus.icon}</span>
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
                                <Badge className={`text-xs ${sessionStatus.bg} ${sessionStatus.color}`}>
                                  {sessionStatus.text}
                                </Badge>
                                
                                {/* Meeting Link for individual sessions */}
                                {appointment.meetingLink && 
                                 sessionStatus.text === 'Upcoming' && (
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
                                
                                {canReschedule && (
            <Button 
                                    size="sm"
              variant="outline"
                                    onClick={() => handleSessionReschedule(appointment, index)}
                                    className="h-7 px-2 text-xs"
            >
                                    <Calendar className="w-3 h-3 mr-1" />
                                    Reschedule
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
    );
                })
              )}
          </div>
        </Card>

        {/* Next Steps Widget - Only show if there's a closest upcoming appointment */}
        {currentAppointment && (
          <AppointmentNextStepWidget 
            appointment={currentAppointment}
            onReschedule={() => {
              setSelectedAppointment(currentAppointment);
              setShowRescheduleDialog(true);
            }}
            onCancel={() => {
              setSelectedAppointment(currentAppointment);
              setShowCancellationDialog(true);
            }}
            onRefresh={fetchStatusData}
          />
        )}
      </div>

      {/* Book Appointment Modal */}
      <Dialog open={showBookDialog} onOpenChange={setShowBookDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book New Appointment</DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(90vh-100px)] overflow-y-auto">
            {(session?.user?.therapyId || currentAppointment?.therapist?.id) && (
              <BookAppointment
                therapyId={session?.user?.therapyId || currentAppointment?.therapist?.id}
                onSuccess={() => {
                  setShowBookDialog(false);
                  fetchStatusData();
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
{selectedAppointment && (
  <RescheduleDialog
    open={showRescheduleDialog}
    onOpenChange={setShowRescheduleDialog}
    appointment={{
            _id: selectedAppointment.id,
      therapist: selectedAppointment.therapist ? { 
        _id: selectedAppointment.therapist.id 
      } : { _id: '' }
    }}
    sessionToBeReduced={rescheduleWithin24Hours}
          sessionInfo={selectedSessionIndex !== null ? {
            index: selectedSessionIndex,
            name: getSessionDisplayName(selectedSessionIndex, selectedAppointment.recurring?.length || 0),
            date: getSessionDateByIndex(selectedAppointment, selectedSessionIndex),
            packageName: selectedAppointment.plan
          } : undefined}
    onSuccess={handleRescheduleSuccess}
    isInitialScheduling={selectedAppointment.customStatus === 'pending_scheduling'}
  />
)}

      {/* Cancellation Dialog */}
      {selectedAppointment && (
        <CancellationDialog
          open={showCancellationDialog}
          onOpenChange={setShowCancellationDialog}
          appointmentId={selectedAppointment.id}
          isWithin24Hours={isWithin24Hours(selectedAppointment.date)}
          onCancel={handleCancellation}
          onReschedule={() => {
            setShowCancellationDialog(false);
            setShowRescheduleDialog(true);
          }}
          isSingleSession={true}
          hasNoShow={selectedAppointment.status === 'no-show'}
        />
      )}

      {/* Chat Window */}
      {activeChatConversation && activeChatTherapist && (
        <ChatWindow
          conversationId={activeChatConversation}
          receiverId={activeChatTherapist.id}
          onClose={() => {
            setActiveChatConversation(null);
            setActiveChatTherapist(null);
          }}
        />
      )}
    </>
  );
};

export default AppointmentStatusView;