"use client"

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { CreditCard, ChevronDown, ChevronUp, Calendar, AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import SessionRescheduleDialog from "./SessionRescheduleDialog";

interface SessionObject {
  index?: number;
  date: string;
  status: 'in_progress' | 'completed';
  payment: 'not_paid' | 'paid';
  _legacy?: boolean;
}

interface AppointmentWidgetProps {
  appointment: {
    id: string;
    _id: string;
    date: string;
    status: string;
    price: number;
    plan: string;
    therapyType: string;
    recurring?: SessionObject[];
    therapist?: {
      id: string;  // Changed from _id to id to match AppointmentStatusView
      name: string;
      image: string;
    } | null;
    isStripeVerified?: boolean;
    isBalance?: boolean;
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
  };
  showActions?: boolean;
  patientName?: string;
  onCancel?: () => void, 
  onReschedule?: () => void,
  onRefresh?: () => Promise<any>;
}

const AppointmentWidget: React.FC<AppointmentWidgetProps> = ({
  appointment,
  showActions = false,
  patientName = 'Patient',
  onCancel, 
  onReschedule,
  onRefresh
}) => {
  const router = useRouter();
  const [showRecurringSessions, setShowRecurringSessions] = useState(false);
  const [showSessionRescheduleDialog, setShowSessionRescheduleDialog] = useState(false);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState<number | null>(null);
  
  // Calculate session count more robustly
  const calculateSessionCount = () => {
    // First try the explicit sessionCount field
    if (appointment.sessionCount && appointment.sessionCount > 0) {
      return appointment.sessionCount;
    }
    
    // Then try totalSessions field
    if (appointment.totalSessions && appointment.totalSessions > 0) {
      return appointment.totalSessions;
    }
    
    // Finally calculate from recurring array
    if (appointment.recurring && Array.isArray(appointment.recurring)) {
      return appointment.recurring.length + 1; // +1 for the main session
    }
    
    return 1; // Default fallback
  };

  const service = {
    duration: 60,
    sessionCount: calculateSessionCount()
  }

  // Calculate session details
  const duration = service?.duration || 60;
  const count = service?.sessionCount || 1;
  
  // Debug logging for session count
  console.log('AppointmentWidget debug:', {
    appointmentId: appointment._id,
    sessionCount: appointment.sessionCount,
    totalSessions: appointment.totalSessions,
    recurringLength: appointment.recurring?.length,
    calculatedCount: count,
    recurring: appointment.recurring
  });
  const therapist = appointment.therapist;
  
  // Calculate per-session price for display
  // Always show per-session price for multi-session appointments
  const perSessionPrice = count > 1 ? appointment.price / count : appointment.price;

  // Check if payment is required
  const isUnpaid = !appointment.isStripeVerified && !appointment.isBalance;
  const isPastAppointment = new Date(appointment.date) < new Date();

  const handlePayNow = () => {
    router.push(`/payment?appointmentId=${appointment._id}&amount=${appointment.price}`);
  };

  const handleSessionReschedule = (sessionIndex: number) => {
    setSelectedSessionIndex(sessionIndex);
    setShowSessionRescheduleDialog(true);
  };

  const handleSessionRescheduleSuccess = async () => {
    setShowSessionRescheduleDialog(false);
    setSelectedSessionIndex(null);
    
    // Refresh the appointment data to show updated session times
    if (onRefresh) {
      try {
        await onRefresh();
      } catch (error) {
        console.error("Error refreshing appointment data:", error);
      }
    }
  };

  // Get status display information
  const getStatusInfo = (status: string) => {
    if (isUnpaid && status !== 'cancelled') {
      return {
        text: 'Payment Required',
        icon: <AlertCircle className="w-5 h-5 text-red-600" />,
        bg: 'bg-red-50',
        border: 'border-red-200',
        textColor: 'text-red-800',
        showPayment: true
      };
    }

    switch (status) {
      case 'matched_pending_therapist_acceptance':
        return {
          text: 'Awaiting Confirmation',
          icon: <Clock className="w-5 h-5 text-blue-600" />,
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          textColor: 'text-blue-800',
          showPayment: false
        };
      case 'pending_scheduling':
        return {
          text: 'Pending Scheduling',
          icon: <Clock className="w-5 h-5 text-orange-600" />,
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          textColor: 'text-orange-800',
          showPayment: false
        };
      case 'approved':
      case 'rescheduled':
        return {
          text: isUnpaid ? 'Confirmed (Unpaid)' : 'Confirmed',
          icon: <Clock className="w-5 h-5 text-green-600" />,
          bg: 'bg-green-50',
          border: 'border-green-200',
          textColor: 'text-green-800',
          showPayment: isUnpaid
        };
      case 'completed':
        return {
          text: isUnpaid ? 'Completed (Unpaid)' : 'Completed',
          icon: <Clock className="w-5 h-5 text-purple-600" />,
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          textColor: 'text-purple-800',
          showPayment: isUnpaid && !isPastAppointment
        };
      case 'cancelled':
        return {
          text: 'Cancelled',
          icon: <Clock className="w-5 h-5 text-red-600" />,
          bg: 'bg-red-50',
          border: 'border-red-200',
          textColor: 'text-red-800',
          showPayment: false
        };
      default:
        return {
          text: isUnpaid ? 'Pending (Unpaid)' : 'Pending',
          icon: <Clock className="w-5 h-5 text-gray-600" />,
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          textColor: 'text-gray-800',
          showPayment: isUnpaid
        };
    }
  };

  const statusInfo = getStatusInfo(appointment.status);

  // Check if recurring sessions exist - be more flexible for rebooked appointments
  const hasRecurringSessions = Array.isArray(appointment.recurring) && 
                              appointment.recurring.length > 0;

  // Debug recurring sessions
  console.log('Recurring sessions debug:', {
    appointmentId: appointment._id,
    hasRecurringSessions,
    recurringArray: appointment.recurring,
    recurringLength: appointment.recurring?.length,
    firstItemType: appointment.recurring?.[0] ? typeof appointment.recurring[0] : 'undefined',
    sessionCount: appointment.sessionCount,
    totalSessions: appointment.totalSessions
  });

  // Function to get status display for recurring sessions
  const getRecurringSessionStatus = (status: string) => {
    switch (status) {
      case 'in_progress':
        return {
          text: 'In Progress',
          color: 'text-blue-600',
          bg: 'bg-blue-100'
        };
      case 'completed':
        return {
          text: 'Completed',
          color: 'text-green-600',
          bg: 'bg-green-100'
        };
      default:
        return {
          text: 'Pending',
          color: 'text-gray-600',
          bg: 'bg-gray-100'
        };
    }
  };

  return (
    <>
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Booking Details</h3>
      <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">
              {appointment.therapyType === 'individual' ? '🧑' : 
               appointment.therapyType === 'couples' ? '👫' : 
               appointment.therapyType === 'kids' ? '🧒' : '🏥'}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {patientName}
              </h3>
              <p className="text-sm text-gray-600">
                {appointment.therapyType === 'individual' ? 'Individual Therapy' : 
                 appointment.therapyType === 'couples' ? 'Couples Therapy' : 
                 appointment.therapyType === 'kids' ? 'Kids Therapy' : 'Therapy'} - {appointment.plan}
              </p>
              {count > 1 && (
                <div className="mt-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {count} Sessions Package
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusInfo.bg} border ${statusInfo.border}`}>
            {statusInfo.icon}
            <span className={`text-sm font-medium ${statusInfo.textColor}`}>
              {statusInfo.text}
            </span>
          </div>
        </div>

        {/* Payment Alert */}
        {isUnpaid && statusInfo.showPayment && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Payment Required</p>
                <p className="text-sm">Please complete payment to confirm this appointment</p>
              </div>
            </div>
          </div>
        )}

        {/* Appointment Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-500" />
            <div>
              <p className="font-medium text-gray-800">
                {format(new Date(appointment.date), 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-sm text-gray-600">
                at {format(new Date(appointment.date), 'h:mm a')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-gray-500" />
            <div>
              <p className="font-medium text-gray-800">
                AED {perSessionPrice.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">
                {duration} min • {count} sessions 
              </p>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        {(appointment.paidAt || appointment.paymentHistory) && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <h5 className="font-medium text-green-800">Payment Information</h5>
            </div>
            <div className="space-y-2 text-sm">
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

        {/* Recurring Sessions */}
        {hasRecurringSessions && (
          <div className="mt-4">
            <button
              onClick={() => setShowRecurringSessions(!showRecurringSessions)}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              {showRecurringSessions ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide Upcoming Sessions
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show Upcoming Sessions ({appointment.recurring?.length || 0})
                </>
              )}
            </button>

            {showRecurringSessions && appointment.recurring && (
              <div className="mt-3 space-y-3 pl-2 border-l-2 border-gray-200">
                {appointment.recurring.map((session, index) => {
                  // Handle both string and object formats
                  const sessionDate = typeof session === 'string' ? session : session.date;
                  const sessionStatus = typeof session === 'object' ? session.status : 'in_progress';
                  const sessionPayment = typeof session === 'object' ? session.payment : 'not_paid';
                  
                  const statusInfo = getRecurringSessionStatus(sessionStatus);
                  const isCompleted = sessionStatus === 'completed';
                  const canReschedule = !isCompleted && appointment.therapist?.id;
                  
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <div className="mt-1 w-2 h-2 rounded-full bg-gray-400"></div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">
                          {format(new Date(sessionDate), 'EEEE, MMMM d, yyyy')}
                        </p>
                        <p className="text-sm text-gray-600">
                          at {format(new Date(sessionDate), 'h:mm a')}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
                            {statusInfo.text}
                          </span>
                          {canReschedule && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSessionReschedule(index)}
                              className="h-6 px-2 text-xs"
                            >
                              <Calendar className="w-3 h-3 mr-1" />
                              Reschedule
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Pay Now Button */}
        {isUnpaid && statusInfo.showPayment && (
          <div className="mt-4">
            <Button 
              onClick={handlePayNow}
              className="w-full gap-2 bg-red-600 hover:bg-red-700"
            >
              <CreditCard className="h-4 w-4" />
              Pay Now
            </Button>
          </div>
        )}

        {/* Therapist Info (if provided) */}
        {therapist && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                {therapist.image ? (
                  <img src={therapist.image} alt={therapist.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-600">👨‍⚕️</span>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-800">{therapist.name}</p>
                <p className="text-sm text-gray-600">Your Therapist</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions (if enabled) */}
        {showActions && !isUnpaid && (
          <div className="mt-6 pt-4 border-t border-gray-200 flex gap-3">
            {onReschedule && <button
              onClick={onReschedule}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reschedule
            </button>}
            {onCancel && <button 
              onClick={onCancel}
              className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>}
          </div>
        )}
      </div>
    </Card>
    
    {/* Session Reschedule Dialog */}
    {showSessionRescheduleDialog && selectedSessionIndex !== null && appointment.therapist && (
      <SessionRescheduleDialog
        open={showSessionRescheduleDialog}
        onOpenChange={setShowSessionRescheduleDialog}
        appointment={{
          _id: appointment._id,
          date: appointment.date,
          therapist: {
            _id: appointment.therapist.id
          },
          recurring: (appointment.recurring || []).map((session, index) => ({
            ...session,
            index
          }))
        }}
        sessionIndex={selectedSessionIndex}
        onSuccess={handleSessionRescheduleSuccess}
      />
    )}
  </>
  );
};

export default AppointmentWidget;