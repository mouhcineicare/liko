"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, isBefore, isPast, addHours } from "date-fns";
import {
  Calendar,
  Video,
  Loader2,
  ChevronDown,
  Filter,
  Search,
  CalendarClock,
  MoreVertical,
  Clock,
  CreditCard,
  CheckCircle,
  AlertCircle,
  XCircle,
  RotateCcw,
  UserX,
  MessageCircle,
  Repeat,
  StopCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { formatInTimeZone } from "date-fns-tz";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import AppointmentStatusView from "./AppointmentStatusView";
import RescheduleDialog from "./RescheduleDialog";
import BookAppointment from "@/app/book-appointment/page";
import CancellationDialog from "./CancellationDialog";
import FeedbackAlert from "./FeedbackAlert";
import NotShownConfirmationPopup from "./NotShownConfirmationPopup";
import SessionBalance from "./SessionBalance";

interface SessionObject {
  date: string;
  status: 'in_progress' | 'completed';
  payment: 'not_paid' | 'paid';
  _legacy?: boolean;
}

interface Appointment {
  _id: string;
  date: string;
  status: string;
  paymentStatus: string;
  therapist: {
    _id: string;
    fullName: string;
    image: string;
  } | null;
  price: number;
  plan: string;
  meetingLink?: string;
  planType: string;
  completedSessions: number;
  totalSessions?: number;
  comment?: string;
  isDateUpdated?: boolean;
  isConfirmed?: boolean;
  hasPreferedDate: boolean;
  canReschedule: boolean;
  recurring: SessionObject[];
  therapyType: string;
  checkoutSessionId?: string;
  isStripeVerified: boolean;
  isBalance: true | null;
  isAccepted: boolean | null;
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

interface Subscription {
  _id: string;
  status: string;
  currentPeriodEnd: Date;
  plan: string;
  price: number;
  cancelAtPeriodEnd: boolean;
}

interface AppointmentsPageProps {
  appointments: Appointment[] | null;
  initialCounts: {
    all: number;
    pending_match: number;
    matched_pending_therapist_acceptance: number;
    pending_scheduling: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    upcoming: number;
    past: number;
  };
}

// Safe data validation and normalization functions
const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  try {
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

const safeFormatDate = (dateValue: any, formatString: string = 'PPpp'): string => {
  const date = safeParseDate(dateValue);
  if (!date) return 'Invalid Date';
  try {
    return format(date, formatString);
  } catch {
    return 'Invalid Date';
  }
};

const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

const safeString = (value: any, defaultValue: string = ''): string => {
  return typeof value === 'string' ? value : defaultValue;
};

const safeArray = (value: any): any[] => {
  return Array.isArray(value) ? value : [];
};

const validateAppointment = (appointment: any): Appointment | null => {
  if (!appointment || typeof appointment !== 'object') return null;
  
  // Ensure required fields exist
  if (!appointment._id || !appointment.date) return null;
  
  return {
    _id: safeString(appointment._id),
    date: safeString(appointment.date),
    status: safeString(appointment.status, 'unpaid'),
    paymentStatus: safeString(appointment.paymentStatus, 'pending'),
    therapist: appointment.therapist && typeof appointment.therapist === 'object' ? {
      _id: safeString(appointment.therapist._id),
      fullName: safeString(appointment.therapist.fullName, 'Unknown Therapist'),
      image: safeString(appointment.therapist.image, '')
    } : null,
    price: safeNumber(appointment.price, 0),
    plan: safeString(appointment.plan, 'Unknown Plan'),
    meetingLink: safeString(appointment.meetingLink, ''),
    planType: safeString(appointment.planType, 'single_session'),
    completedSessions: safeNumber(appointment.completedSessions, 0),
    totalSessions: safeNumber(appointment.totalSessions, 1),
    comment: safeString(appointment.comment, ''),
    isDateUpdated: Boolean(appointment.isDateUpdated),
    isConfirmed: Boolean(appointment.isConfirmed),
    hasPreferedDate: Boolean(appointment.hasPreferedDate),
    canReschedule: Boolean(appointment.canReschedule),
    recurring: safeArray(appointment.recurring),
    therapyType: safeString(appointment.therapyType, 'individual'),
    checkoutSessionId: safeString(appointment.checkoutSessionId, ''),
    isStripeVerified: Boolean(appointment.isStripeVerified),
    isBalance: appointment.isBalance === true ? true : null,
    isAccepted: appointment.isAccepted === true ? true : appointment.isAccepted === false ? false : null
  };
};

export default function AppointmentsPage({ 
  appointments: initialAppointments,
  initialCounts
}: AppointmentsPageProps) {
  // Safely validate and normalize initial data
  const safeInitialAppointments = useMemo(() => {
    if (!initialAppointments) return [];
    return initialAppointments
      .map(validateAppointment)
      .filter(Boolean) as Appointment[];
  }, [initialAppointments]);

  const safeInitialCounts = useMemo(() => ({
    all: safeNumber(initialCounts?.all, 0),
    pending_match: safeNumber(initialCounts?.pending_match, 0),
    matched_pending_therapist_acceptance: safeNumber(initialCounts?.matched_pending_therapist_acceptance, 0),
    pending_scheduling: safeNumber(initialCounts?.pending_scheduling, 0),
    confirmed: safeNumber(initialCounts?.confirmed, 0),
    completed: safeNumber(initialCounts?.completed, 0),
    cancelled: safeNumber(initialCounts?.cancelled, 0),
    upcoming: safeNumber(initialCounts?.upcoming, 0)
  }), [initialCounts]);

  const [appointments, setAppointments] = useState<Appointment[]>(safeInitialAppointments);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const [showNotShownPopup, setShowNotShownPopup] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [totalAppointmentsCount, setTotalAppointmentsCount] = useState(0);
  const [visibleAppointmentsCount, setVisibleAppointmentsCount] = useState(0);
  const [sortType, setSortType] = useState<"proximity" | "newest" | "oldest">("newest");
  const [isEndLoadingMore, setIsEndLoadingMore] = useState(false);
  const [rescheduleWithin24Hours, setRescheduleWithin24Hours] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const { data: sessionData, status: sessionStatus } = useSession();
  const matchStatus = sessionData?.user?.therapyId ? 'matched' : 'pending';
  const params = useSearchParams();
  const planId = params.get("planId");
  const router = useRouter();
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [counts, setCounts] = useState(safeInitialCounts);
  const appointmentsCountRef = useRef(0);

  useEffect(() => {
    if (planId) setShowBookDialog(true);
  }, [planId]);

  const statusOptions = useMemo(() => [
    { value: 'all', label: 'All Appointments', count: counts.all },
    { value: 'pending_match', label: 'Pending Match', count: counts.pending_match },
    { value: 'matched_pending_therapist_acceptance', label: 'Awaiting Confirmation', count: counts.matched_pending_therapist_acceptance },
    { value: 'pending_scheduling', label: 'Pending Scheduling', count: counts.pending_scheduling },
    { value: 'confirmed', label: 'Confirmed', count: counts.confirmed },
    { value: 'completed', label: 'Completed', count: counts.completed },
    { value: 'cancelled', label: 'Cancelled', count: counts.cancelled },
    { value: 'upcoming', label: 'Upcoming', count: counts.upcoming }
  ], [counts]);

  const filteredAppointments = useMemo(() => {
    if (filter === 'all') return appointments;
    return appointments.filter(apt => {
      if (!apt || !apt.date) return false;
      
      const appointmentDate = safeParseDate(apt.date);
      if (!appointmentDate) return false;
      
      if (filter === 'upcoming') return appointmentDate > new Date();
      return apt.status === filter;
    });
  }, [appointments, filter]);

const fetchAppointments = useCallback(async (loadMore = false, filterStatus = filter) => {
  try {
    if (loadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setAppointments([]); // Clear existing appointments for initial load
    }

    const skip = loadMore ? appointmentsCountRef.current : 0;
    const limit = 100;

    if (sessionStatus === "loading") return;

    // Always use POST for filtered requests
    const response = await fetch('/api/patient/appointments/filter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        status: filterStatus,
        skip,
        limit
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const rawAppointments = data?.appointments || [];
      
      // Validate and normalize appointments
      const validatedAppointments = rawAppointments
        .map(validateAppointment)
        .filter(Boolean) as Appointment[];

      if (data.counts) {
        setCounts({
          all: safeNumber(data.counts.all, 0),
          pending_match: safeNumber(data.counts.pending_match, 0),
          matched_pending_therapist_acceptance: safeNumber(data.counts.matched_pending_therapist_acceptance, 0),
          pending_scheduling: safeNumber(data.counts.pending_scheduling, 0),
          confirmed: safeNumber(data.counts.confirmed, 0),
          completed: safeNumber(data.counts.completed, 0),
          cancelled: safeNumber(data.counts.cancelled, 0),
          upcoming: safeNumber(data.counts.upcoming, 0),
          past: safeNumber(data.counts.past, 0)
        });
      }

      if (validatedAppointments.length === 0) {
        setIsEndLoadingMore(true);
      } else {
        setIsEndLoadingMore(false);
      }

      const today = new Date();
      const sortedData = validatedAppointments.sort((a: Appointment, b: Appointment) => {
        const dateA = safeParseDate(a.date);
        const dateB = safeParseDate(b.date);
        
        if (!dateA || !dateB) return 0;
        
        if (sortType === "newest") return dateB.getTime() - dateA.getTime();
        if (sortType === "oldest") return dateA.getTime() - dateB.getTime();
        const diffA = Math.abs(dateA.getTime() - today.getTime());
        const diffB = Math.abs(dateB.getTime() - today.getTime());
        return diffA - diffB;
      });

      if (loadMore) {
        setAppointments((prev) => {
          const newAppointments = [...prev, ...sortedData];
          appointmentsCountRef.current = newAppointments.length;
          return newAppointments;
        });
      } else {
        setAppointments(sortedData);
        appointmentsCountRef.current = sortedData.length;
      }

      setTotalAppointmentsCount(safeNumber(data?.total, 0));
      setVisibleAppointmentsCount(loadMore ? appointmentsCountRef.current : validatedAppointments.length);
    } else {
      toast.error("Failed to load appointments: " + response.statusText);
    }
  } catch (error) {
    console.error("Error fetching appointments:", error);
    toast.error("Failed to load appointments");
  } finally {
    setIsLoading(false);
    setIsLoadingMore(false);
    setIsFilterLoading(false);
  }
}, [sessionStatus, filter, sortType]);


  const handleFilterChange = useCallback(async (newFilter: string) => {
    try {
      setFilter(newFilter);
      setIsFilterLoading(true);
      await fetchAppointments(false, newFilter);
    } catch (error) {
      console.error("Filter error:", error);
      toast.error("Failed to apply filter");
    }
  }, [fetchAppointments]);

  useEffect(() => {
    if (sessionStatus === "authenticated" && sessionData?.user?.id) {
      fetchAppointments();
    }
  }, [sessionStatus, sessionData?.user?.id]);

  const sortAppointments = (type: "proximity" | "newest" | "oldest") => {
    setSortType(type);
    const sorted = [...appointments].sort((a, b) => {
      const dateA = safeParseDate(a.date);
      const dateB = safeParseDate(b.date);
      
      if (!dateA || !dateB) return 0;
      
      if (type === "newest") return dateB.getTime() - dateA.getTime();
      if (type === "oldest") return dateA.getTime() - dateB.getTime();
      const today = new Date();
      const diffA = Math.abs(dateA.getTime() - today.getTime());
      const diffB = Math.abs(dateB.getTime() - today.getTime());
      return diffA - diffB;
    });
    setAppointments(sorted);
  };

  const handleLoadMore = () => fetchAppointments(true);

  const convertTimeToTimeZone = (startDate: string, timeZone: string) => {
    try {
      const date = safeParseDate(startDate);
      if (!date) return "Invalid Time";
      return formatInTimeZone(date, timeZone, 'h:mm a');
    } catch {
      return "Error Time";
    }
  };

  const isWithin24Hours = (appointmentDate: string): boolean => {
    const appointmentDateObj = safeParseDate(appointmentDate);
    if (!appointmentDateObj) return false;
    
    const now = new Date();
    const twentyFourHoursBefore = addHours(appointmentDateObj, -24);
    return !isBefore(now, twentyFourHoursBefore);
  };

  const handleCancellation = async (appointmentId: string, charge: boolean) => {
    try {
      const response = await fetch("/api/patient/appointments/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, charge, reduceSession: charge ? 0.5 : 0 }),
      });

      if (!response.ok) throw new Error("Failed to cancel appointment");
      fetchAppointments();
      toast.success("Appointment cancelled successfully");
      
      // Refresh the whole page after successful cancellation
      window.location.reload();
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast.error("Failed to cancel appointment");
    }
  };

  const handleReschedule = (appointmentId: string, isWithin24Hours: boolean) => {
    setRescheduleWithin24Hours(isWithin24Hours);
    setShowRescheduleDialog(true);
  };

  const handleRescheduleSuccess = async () => {
    await fetchAppointments();
    toast.success(
      rescheduleWithin24Hours 
        ? "Appointment rescheduled successfully. One session has been deducted."
        : "Appointment rescheduled and confirmed successfully."
    );
    setRescheduleWithin24Hours(false);
  };

  const handlePayNow = async (appointmentId: string, amount: number) => {
    return router.push(`/payment?appointmentId=${appointmentId}&amount=${amount}`);
  }

  const handleMarkAsNotShown = async (appointmentId: string) => {
    try {
      const response = await fetch("/api/patient/appointments/not-shown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });

      if (!response.ok) throw new Error("Failed to mark as not shown");
      const data = await response.json();

      if (data?.redirectToPayment) {
        router.push(`/payment?appointmentId=${data?.appointment._id}&amount=${data?.paymentAmount}`);
      } else {
        setAppointments(prev => prev.map(apt => apt._id === appointmentId ? data?.appointment : apt));
        toast.success("Appointment updated successfully");
      }
    } catch (error) {
      console.error("Error marking as not shown:", error);
      toast.error("Failed to update appointment");
    } finally {
      setShowNotShownPopup(false);
    }
  };

  const handleRemoveAppointment = async (appointmentId: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, { method: "DELETE" });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to remove appointment");
      }
      setAppointments(appointments.filter(apt => apt._id !== appointmentId));
      toast.success("Appointment removed successfully");
    } catch (error: any) {
      console.error("Error removing appointment:", error);
      toast.error(error.message || "Failed to remove appointment");
    }
  };

  const normalizeSessions = (recurring: any[] | undefined): SessionObject[] => {
    if (!Array.isArray(recurring)) return [];
    if (recurring.length > 0 && typeof recurring[0] === 'string') {
      return recurring.map(date => ({
        date: safeString(date),
        status: 'in_progress',
        payment: 'not_paid',
        _legacy: true
      }));
    }
    return recurring.map((session, idx) => {
      if (typeof session === 'object' && session !== null && session.date) {
        return {
          ...session,
          status: session.status || 'in_progress',
          payment: session.payment || 'not_paid',
          _legacy: false
        };
      }
      console.warn('Malformed session at idx', idx, session);
      return {
        date: '',
        status: 'in_progress',
        payment: 'not_paid',
        _legacy: true
      };
    });
  };

  const formatSessionDate = (dateValue: string | Date | undefined | null) => {
    return safeFormatDate(dateValue);
  };

  const renderAppointmentCardSkeleton = () => (
    <Card className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-36 mt-2" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </Card>
  );

  const calculateTotalSessions = (appointment: Appointment): number => {
    if (typeof appointment.totalSessions === 'number' && appointment.totalSessions > 0) {
      return appointment.totalSessions;
    }
    return 1;
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending_match':
        return {
          icon: <Clock className="w-5 h-5 text-blue-600" />,
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          textColor: 'text-blue-800',
          label: 'Pending Match'
        };
      case 'matched_pending_therapist_acceptance':
        return {
          icon: <AlertCircle className="w-5 h-5 text-orange-600" />,
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          textColor: 'text-orange-800',
          label: 'Awaiting Confirmation'
        };
      case 'pending_scheduling':
        return {
          icon: <CalendarClock className="w-5 h-5 text-yellow-600" />,
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          textColor: 'text-yellow-800',
          label: 'Pending Scheduling'
        };
      case 'confirmed':
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
          bg: 'bg-green-50',
          border: 'border-green-200',
          textColor: 'text-green-800',
          label: 'Confirmed'
        };
      case 'completed':
        return {
          icon: <CheckCircle className="w-5 h-5 text-purple-600" />,
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          textColor: 'text-purple-800',
          label: 'Completed'
        };
      case 'cancelled':
        return {
          icon: <XCircle className="w-5 h-5 text-red-600" />,
          bg: 'bg-red-50',
          border: 'border-red-200',
          textColor: 'text-red-800',
          label: 'Cancelled'
        };
      case 'upcoming':
        return {
          icon: <CalendarClock className="w-5 h-5 text-blue-600" />,
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          textColor: 'text-blue-800',
          label: 'Upcoming'
        };
      case 'past':
        return {
          icon: <Clock className="w-5 h-5 text-gray-600" />,
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          textColor: 'text-gray-800',
          label: 'Past'
        };
      default:
        return {
          icon: <Clock className="w-5 h-5 text-gray-600" />,
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          textColor: 'text-gray-800',
          label: 'Pending'
        };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <SessionBalance/>

        <AppointmentStatusView />

        {matchStatus === 'matched' && (
          <div className="space-y-6">
            <Card className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Your Appointments (Read-Only View)</h3>
                <p className="text-sm text-gray-600 -mt-2 mb-2">
                  Use "Your Active Packages" section above to reschedule or cancel appointments
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                  <p className="text-blue-800 font-medium">
                    {filteredAppointments.length} appointments
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Filter by Status</h4>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => handleFilterChange(option.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filter === option.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } ${option.count === 0 && 'bg-gray-300 text-gray-700 hover:bg-gray-300'}`}
                      disabled={isFilterLoading || option.count === 0}
                    >
                      {option.label} ({option.count})
                      {((isFilterLoading) && filter === option.value) ? (
                        <Loader2 className="ml-1 h-3 w-3 animate-spin inline" />
                      ): (option.count === 0 && <StopCircle className="ml-1 h-3 w-3 inline" /> ) }
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search appointments..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <CalendarClock className="h-4 w-4" />
                      {sortType === "proximity" && "Closest"}
                      {sortType === "newest" && "Newest"}
                      {sortType === "oldest" && "Oldest"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => sortAppointments("proximity")}>
                      <CalendarClock className="h-4 w-4 mr-2" /> Closest to Today
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => sortAppointments("newest")}>
                      <ChevronDown className="h-4 w-4 mr-2" /> Newest First
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => sortAppointments("oldest")}>
                      <ChevronDown className="h-4 w-4 mr-2" /> Oldest First
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={`appointment-skeleton-${i}`}>{renderAppointmentCardSkeleton()}</div>
                ))}
              </div>
            ) : filteredAppointments.length === 0 ? (
              <Card className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <p className="text-gray-500">No appointments found matching your filter</p>
                <Button className="mt-4" onClick={() => setShowBookDialog(true)}>
                  Book New Appointment
                </Button>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    {getStatusConfig(filter).icon}
                    <span className="ml-2">
                      {statusOptions.find(opt => opt.value === filter)?.label} ({filteredAppointments.length})
                    </span>
                  </h4>
                  <div className="space-y-4">
                    {filteredAppointments.map((appointment) => (
                      <AppointmentCard 
                        key={appointment._id}
                        appointment={appointment}
                        onReschedule={() => {
                          setSelectedAppointment(appointment);
                          setShowRescheduleDialog(true);
                        }}
                        onCancel={() => {
                          setSelectedAppointment(appointment);
                          setShowCancellationDialog(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {visibleAppointmentsCount < totalAppointmentsCount && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isEndLoadingMore || isLoadingMore}
                  className="gap-2"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : isEndLoadingMore ? (
                    "No More Appointments"
                  ) : (
                    "Load More Appointments"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        <Dialog open={showBookDialog} onOpenChange={setShowBookDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Book New Appointment</DialogTitle>
            </DialogHeader>
            <div className="max-h-[calc(90vh-100px)] overflow-y-auto">
              {sessionData?.user?.therapyId && (
                <BookAppointment
                  therapyId={sessionData.user.therapyId}
                  onSuccess={() => {
                    setShowBookDialog(false);
                    fetchAppointments();
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {selectedAppointment && (
          <>
            <RescheduleDialog
              open={showRescheduleDialog}
              onOpenChange={setShowRescheduleDialog}
              appointment={{
                _id: selectedAppointment._id,
                therapist: selectedAppointment.therapist ? { _id: selectedAppointment.therapist._id } : { _id: '' }
              }}
              sessionToBeReduced={selectedAppointment.status === 'no-show' || isWithin24Hours(selectedAppointment.date)}
              onSuccess={handleRescheduleSuccess}
            />

            <CancellationDialog
              open={showCancellationDialog}
              onOpenChange={setShowCancellationDialog}
              appointmentId={selectedAppointment._id}
              isWithin24Hours={isWithin24Hours(selectedAppointment.date)}
              onCancel={handleCancellation}
              onReschedule={() => {
                setShowCancellationDialog(false);
                setShowRescheduleDialog(true);
              }}
              isSingleSession={calculateTotalSessions(selectedAppointment) === 1}
              hasNoShow={selectedAppointment.status === 'no-show'}
            />

            <NotShownConfirmationPopup
              isOpen={showNotShownPopup}
              onClose={() => setShowNotShownPopup(false)}
              onConfirm={() => handleMarkAsNotShown(selectedAppointment._id)}
              isSingleSession={selectedAppointment.totalSessions === 1}
            />
          </>
        )}
      </div>
    </div>
  );
}

const AppointmentCard = ({ 
  appointment, 
  onReschedule, 
  onCancel 
}: { 
  appointment: Appointment, 
  onReschedule: () => void, 
  onCancel: () => void 
}) => {
  const router = useRouter();
  
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

  const isUnpaid = !appointment.isStripeVerified && !appointment.isBalance;
  const canShowPayButton = isUnpaid && !isAppointmentExpired(appointment.date);

  const handlePayNow = () => {
    router.push(`/payment?appointmentId=${appointment._id}&amount=${appointment.price}`);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending_match':
        return {
          icon: <Clock className="w-5 h-5 text-blue-600" />,
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          textColor: 'text-blue-800',
          label: 'Pending Match'
        };
      case 'matched_pending_therapist_acceptance':
        return {
          icon: <AlertCircle className="w-5 h-5 text-orange-600" />,
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          textColor: 'text-orange-800',
          label: 'Awaiting Confirmation'
        };
      case 'pending_scheduling':
        return {
          icon: <CalendarClock className="w-5 h-5 text-yellow-600" />,
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          textColor: 'text-yellow-800',
          label: 'Pending Scheduling'
        };
      case 'confirmed':
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
          bg: 'bg-green-50',
          border: 'border-green-200',
          textColor: 'text-green-800',
          label: 'Confirmed'
        };
      case 'completed':
        return {
          icon: <CheckCircle className="w-5 h-5 text-purple-600" />,
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          textColor: 'text-purple-800',
          label: isUnpaid ? 'Completed (Unpaid)' : 'Completed'
        };
      case 'cancelled':
        return {
          icon: <XCircle className="w-5 h-5 text-red-600" />,
          bg: 'bg-red-50',
          border: 'border-red-200',
          textColor: 'text-red-800',
          label: 'Cancelled'
        };
      case 'upcoming':
        return {
          icon: <CalendarClock className="w-5 h-5 text-blue-600" />,
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          textColor: 'text-blue-800',
          label: isUnpaid ? 'Upcoming (Unpaid)' : 'Upcoming'
        };
      case 'past':
        return {
          icon: <Clock className="w-5 h-5 text-gray-600" />,
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          textColor: 'text-gray-800',
          label: isUnpaid ? 'Past (Unpaid)' : 'Past'
        };
      default:
        return {
          icon: <Clock className="w-5 h-5 text-gray-600" />,
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          textColor: 'text-gray-800',
          label: 'Pending'
        };
    }
  };

  const calculateTotalSessions = (appointment: Appointment): number => {
    if (typeof appointment.totalSessions === 'number' && appointment.totalSessions > 0) {
      return appointment.totalSessions;
    }
    switch (appointment.planType) {
      case "x2_sessions": return 2;
      case "x3_sessions": return 3;
      case "x4_sessions": return 4;
      case "x5_sessions": return 5;
      case "x6_sessions": return 6;
      case "x7_sessions": return 7;
      case "x8_sessions": return 8;
      case "x9_sessions": return 9;
      case "x10_sessions": return 10;
      case "x11_sessions": return 11;
      case "x12_sessions": return 12;
      default: return 1;
    }
  };

  const calculateProgress = (appointment: Appointment) => {
    const totalSessions = calculateTotalSessions(appointment);
    const completedSessions = appointment.completedSessions || 0;
    const remainingSessions = totalSessions - completedSessions;
    const progress = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
    return { progress, totalSessions, completedSessions, remainingSessions };
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

  const { progress, totalSessions, remainingSessions } = calculateProgress(appointment);
  const canJoin = appointment.meetingLink && canJoinMeeting(appointment.date);
  const isExpired = isAppointmentExpired(appointment.date);
  const isCancelled = appointment.status === "cancelled";
  const isCompleted = appointment.status === "completed";
  const isPaid = appointment.isStripeVerified || appointment.isBalance;
  const statusConfig = getStatusConfig(appointment.status);
  const isConfirmed = appointment.isAccepted && appointment.isConfirmed;

  // Safe date formatting
  const appointmentDate = safeParseDate(appointment.date);
  const formattedDate = appointmentDate ? format(appointmentDate, 'EEEE, MMMM d, yyyy') : 'Invalid Date';
  const formattedTime = appointmentDate ? format(appointmentDate, 'h:mm a') : 'Invalid Time';

  return (
    <Card className={`rounded-lg p-4 ${statusConfig.bg} border ${statusConfig.border}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-medium text-gray-900">
            {formattedDate}
          </h3>
          <p className="text-sm text-gray-600">
            at {formattedTime}
          </p>
        </div>
        <Badge className={`${statusConfig.textColor} ${statusConfig.bg}`}>
          {statusConfig.icon}
          <span className="ml-1">{statusConfig.label}</span>
        </Badge>
      </div>

      {appointment.therapist && (
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
            {appointment.therapist.image ? (
              <img 
                src={appointment.therapist.image} 
                alt={appointment.therapist.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-600">👨‍⚕️</span>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-800">{appointment.therapist.fullName}</p>
            <p className="text-sm text-gray-600">Therapist</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-3">
        <CreditCard className="w-5 h-5 text-gray-500" />
        <div>
          <p className="font-medium text-gray-800">
            AED {(appointment.price || 0).toFixed(2)}
          </p>
          <p className="text-sm text-gray-600">
            {appointment.therapyType === 'individual' ? 'Individual' : 
             appointment.therapyType === 'couples' ? 'Couples' : 'Kids'} Therapy
            {isUnpaid && (
              <span className="ml-2 text-red-500">(Unpaid)</span>
            )}
          </p>
        </div>
      </div>

      {canShowPayButton && (
        <div className="mb-3">
          <Button
            onClick={handlePayNow}
            className="w-full gap-2 bg-red-600 hover:bg-red-700"
            size="sm"
          >
            <CreditCard className="h-4 w-4" />
            Pay Now
          </Button>
        </div>
      )}

      {appointment.meetingLink && !isExpired && isPaid && !isCancelled && !isCompleted && (
        <div className="mb-3">
          <Button
            onClick={() => handleJoinMeeting(appointment.meetingLink || '')}
            disabled={!canJoin}
            className="w-full gap-2"
            size="sm"
          >
            <Video className="h-4 w-4" />
            {canJoin ? "Join Session" : "Not Available Yet"}
          </Button>
        </div>
      )}

      {isPaid && totalSessions > 1 && (
        <div className="mb-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">
              Sessions: {remainingSessions} of {totalSessions} remaining
            </span>
            <span className="text-gray-500">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Payment Information */}
      {(appointment.paidAt || appointment.paymentHistory) && (
        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <h5 className="font-medium text-green-800 text-sm">Payment Information</h5>
          </div>
          <div className="space-y-1 text-xs">
            {appointment.paidAt && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3 text-green-600" />
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
                <CreditCard className="w-3 h-3 text-green-600" />
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

      {/* Control buttons removed - use "Your Active Packages" section for rescheduling/cancelling */}
    </Card>
  );
};