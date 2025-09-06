"use client";

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Loader2, Save, Edit3, ChevronDown, ChevronUp, CheckCircle, X, Eye, Phone, Link, Search, Filter, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import SessionListPopup from '@/components/dashboard/SessionListPopup';
import EditAppointmentDialog from '@/components/dashboard/therapist/EditAppointmentDialog';
import { convertAppointmentTimes, safeParseDate } from '@/lib/utils/dateUtils';

interface Appointment {
  _id: string;
  patient: {
    _id: string;
    fullName: string;
    email: string;
    telephone: string;
    image?: string;
  };
  date: string;
  plan: string;
  status: string;
  paymentStatus: string;
  declineComment?: string;
  meetingLink?: string;
  patientTimezone: string;
  stripePaymentStatus: string;
  isStripeActive: boolean;
  stripeVerified?: boolean;
  isBalance: boolean | null;
  checkoutSessionId: string | null;
  totalSessions: number;
  completedSessions: number;
  recurring: {
    date: string;
    status: string;
    payment: string;
  }[];
}

interface AvailabilityDay {
  day: string;
  hours: string[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface ApiResponse {
  appointments: Appointment[];
  pagination: Pagination;
  statusCounts: {
    all: number;
    pending_approval: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  };
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const timeSlots = Array.from({ length: 15 }, (_, i) => {
  const hour = i + 8;
  return [
    `${hour.toString().padStart(2, '0')}:00`,
    `${hour.toString().padStart(2, '0')}:30`
  ];
}).flat();

interface TherapistDashboardProps {
  initialAppointments?: Appointment[];
}

const TherapistDashboard: React.FC<TherapistDashboardProps> = ({ initialAppointments = [] }) => {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [pendingAppointments, setPendingAppointments] = useState<Appointment[]>([]);
  const [availability, setAvailability] = useState<AvailabilityDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [decision, setDecision] = useState<'accept' | 'reject' | null>(null);
  const [declineComment, setDeclineComment] = useState('');
  const [activeSection, setActiveSection] = useState<'requests' | 'appointments'>('requests');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    pending_approval: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editAppointmentId, setEditAppointmentId] = useState<string | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionModalData, setSessionModalData] = useState<any[]>([]);
  const [selectedSessionAppointment, setSelectedSessionAppointment] = useState<Appointment | null>(null);
  const [meetingLinkInput, setMeetingLinkInput] = useState('');
  const [editingMeetingLink, setEditingMeetingLink] = useState<string | null>(null);
  const [isEditingAvailability, setIsEditingAvailability] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);


useEffect(() => {
  fetchPendingAppointments();
  fetchAvailability();
}, []);

useEffect(() => {
  if (searchTerm) {
    setIsSearching(true);
  }
  const timerId = setTimeout(() => {
    setDebouncedSearchTerm(searchTerm);
    setIsSearching(false);
  }, 500);

  return () => {
    clearTimeout(timerId);
    setIsSearching(false);
  };
}, [searchTerm]);

useEffect(() => {
  fetchAppointments();
}, [activeSection, pagination.page, pagination.limit, filterStatus, debouncedSearchTerm, selectedPlan, dateRange]);

  const fetchPendingAppointments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/therapist/appointments/requests');
      if (response.ok) {
        const data = await response.json();
        setPendingAppointments(data);
      }
    } catch (error) {
      console.error('Error fetching pending appointments:', error);
      toast.error('Failed to load pending appointments');
    } finally {
      setIsLoading(false);
    }
  };

const fetchAppointments = async () => {
    setIsLoading(true);
  try {
    const params = new URLSearchParams();
    params.append('page', pagination.page.toString());
    params.append('limit', pagination.limit.toString());
    if (filterStatus !== 'all') params.append('status', filterStatus);
    if (debouncedSearchTerm) {
      params.append('search', debouncedSearchTerm);
    }
    if (selectedPlan && selectedPlan !== 'all') params.append('plan', selectedPlan);
    if (dateRange.from) params.append('dateFrom', dateRange.from.toISOString());
    if (dateRange.to) params.append('dateTo', dateRange.to.toISOString());

    const response = await fetch(`/api/therapist/sessions?${params.toString()}`);
      if (response.ok) {
        const data: ApiResponse = await response.json();
        setAppointments(data.appointments);
        setPagination({
          ...pagination,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
          hasNextPage: data.pagination.hasNextPage,
          hasPrevPage: data.pagination.hasPrevPage
        });
        setStatusCounts(data.statusCounts);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailability = async () => {
    try {
      const response = await fetch('/api/therapist/profile/form');
      if (response.ok) {
        const data = await response.json();
        setAvailability(data.availability || []);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  const handleAcceptAppointment = async (appointmentId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/therapist/appointments/${appointmentId}/accept`, {
        method: 'PUT',
      });
      
      if (response.ok) {
        toast.success('Appointment accepted successfully');
        fetchPendingAppointments();
        fetchAppointments();
      } else {
        throw new Error('Failed to accept appointment');
      }
    } catch (error) {
      console.error('Error accepting appointment:', error);
      toast.error('Failed to accept appointment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectAppointment = async (appointmentId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/therapist/appointments/${appointmentId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          declineComment: declineComment || 'No reason provided' 
        }),
      });
      
      if (response.ok) {
        toast.success('Appointment declined successfully');
        fetchPendingAppointments();
        fetchAppointments();
      } else {
        throw new Error('Failed to reject appointment');
      }
    } catch (error) {
      console.error('Error rejecting appointment:', error);
      toast.error('Failed to reject appointment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMeetingLink = async (appointmentId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/meetinglink`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          meetingLink: meetingLinkInput
        }),
      });
      
      if (response.ok) {
        toast.success('Meeting link saved successfully');
        setEditingMeetingLink(null);
        setMeetingLinkInput('');
        fetchAppointments();
      } else {
        throw new Error('Failed to save meeting link');
      }
    } catch (error) {
      console.error('Error saving meeting link:', error);
      toast.error('Failed to save meeting link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteAppointment = async (appointment: Appointment) => {
    setSelectedSessionAppointment(appointment);
    const sessions = appointment.recurring || [];
    setSessionModalData([
      {
        _id: 'main',
        date: appointment.date,
        status: appointment.status,
        price: 0,
        isCurrent: true
      },
      ...sessions.map((s: any) => ({
        _id: s.date,
        date: s.date,
        status: s.status,
        price: 0,
        isCurrent: false
      }))
    ]);
    setShowSessionModal(true);
  };

  const handleEditAppointment = (appointmentId: string) => {
    setEditAppointmentId(appointmentId);
    setShowEditDialog(true);
  };


  const formatAppointmentDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const renderPaymentStatus = (appointment: Appointment) => {
    if (appointment.isBalance) {
      return <Badge className="bg-green-100 text-green-800">Balance Used</Badge>;
    }
    if (appointment.stripeVerified) {
      return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
    }
    if (appointment.stripePaymentStatus === 'unpaid') {
      return <Badge className="bg-yellow-100 text-yellow-800">Pending Payment</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Copied to clipboard'))
      .catch(() => toast.error('Failed to copy'));
  };

  const copyPaymentLink = (appointmentId: string) => {
    const paymentLink = `${window.location.origin}/payment?appointmentId=${appointmentId}`;
    copyToClipboard(paymentLink);
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleApplyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    const filters: string[] = [];
    if (selectedPlan) filters.push(`Plan: ${selectedPlan}`);
    if (dateRange.from) {
      filters.push(`Date: ${format(dateRange.from, 'MMM d, yyyy')}${dateRange.to ? ` - ${format(dateRange.to, 'MMM d, yyyy')}` : ''}`);
    }
    setActiveFilters(filters);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setSelectedPlan('');
    setDateRange({});
    setSearchTerm('');
    setActiveFilters([]);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const updateAvailability = async (newAvailability: AvailabilityDay[]) => {
    try {
      const response = await fetch('/api/therapist/profile/form', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ availability: newAvailability }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update availability');
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      throw error;
    }
  };

   const handleSaveAvailability = async () => {
    setIsLoading(true);
    try {
      await updateAvailability(availability);
      setIsEditingAvailability(false);
    } catch (error) {
      console.error('Error saving availability:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTimeSlot = (day: string, time: string) => {
    if (!isEditingAvailability) return;

    setAvailability(prev => {
      const newAvailability = JSON.parse(JSON.stringify(prev));
      const dayIndex = newAvailability.findIndex((d: AvailabilityDay) => d.day === day);
      
      if (dayIndex >= 0) {
        const hourIndex = newAvailability[dayIndex].hours.indexOf(time);
        if (hourIndex >= 0) {
          newAvailability[dayIndex].hours.splice(hourIndex, 1);
          if (newAvailability[dayIndex].hours.length === 0) {
            newAvailability.splice(dayIndex, 1);
          }
        } else {
          newAvailability[dayIndex].hours.push(time);
          newAvailability[dayIndex].hours.sort();
        }
      } else {
        newAvailability.push({
          day,
          hours: [time]
        });
      }
      
      return newAvailability;
    });
  };

  const renderStatusBadge = (status: string) => {
  switch (status) {
    case 'pending_approval':
      return <Badge className="bg-yellow-100 text-yellow-800">Pending Scheduling</Badge>;
    case 'confirmed':
      return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
    case 'completed':
      return <Badge className="bg-purple-100 text-purple-800">Completed</Badge>;
    case 'cancelled':
      return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
  }
};

  const handleRemoveFilter = (filter: string) => {
    if (filter.startsWith('Plan:')) {
      setSelectedPlan('');
    } else if (filter.startsWith('Date:')) {
      setDateRange({});
    }
    setActiveFilters(prev => prev.filter(f => f !== filter));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

const renderAppointmentDate = (appointment: Appointment) => {
  const date = safeParseDate(appointment.date);
  const timeInfo = convertAppointmentTimes(
    appointment.date,
    appointment.patientTimezone,
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  return (
    <div className="space-y-1">
      <div className="flex items-center text-sm text-gray-500">
        <Clock className="w-4 h-4 mr-1" />
        <span>{timeInfo.isValid ? timeInfo.therapistTime : 'Invalid time'}</span>
      </div>
      <div className="text-sm text-gray-900">
        {date ? format(date, 'MMM d, yyyy') : 'Invalid date'} • {appointment.patientTimezone}
      </div>
      {!date && (
        <div className="text-xs text-yellow-600 flex items-center mt-1">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Please update this appointment's date
        </div>
      )}
    </div>
  );
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="text-gray-600">
            Manage your appointment requests and schedule
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="flex">
            <button
              onClick={() => setActiveSection('requests')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeSection === 'requests'
                  ? 'bg-blue-600 text-white rounded-l-lg'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              Appointment Requests ({pendingAppointments.length})
            </button>
            <button
              onClick={() => setActiveSection('appointments')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeSection === 'appointments'
                  ? 'bg-blue-600 text-white rounded-r-lg'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              All Appointments ({pagination.total})
            </button>
          </div>
        </div>

        {/* Content Sections */}
        {activeSection === 'requests' && (
          <div className="space-y-6">
            {/* Request List */}
            {isLoading ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto" />
              </div>
            ) : pendingAppointments.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">No Pending Requests</h2>
                <p className="text-gray-600">
                  You don't have any pending appointment requests at the moment.
                </p>
              </div>
            ) : (
              pendingAppointments.map(appointment => (
                <AppointmentRequestCard
                  key={appointment._id}
                  appointment={appointment}
                  onDecision={(id, decision) => 
                    decision === 'accept' 
                      ? handleAcceptAppointment(id) 
                      : handleRejectAppointment(id)
                  }
                  onSelect={setSelectedAppointment}
                  declineComment={declineComment}
                  setDeclineComment={setDeclineComment}
                  decision={decision}
                  setDecision={setDecision}
                  isLoading={isLoading}
                />
              ))
            )}

            {/* Availability Section */}
            <AvailabilitySection
              availability={availability}
              isEditing={isEditingAvailability}
              onToggleEdit={() => setIsEditingAvailability(!isEditingAvailability)}
              onToggleSlot={toggleTimeSlot}
              onSave={handleSaveAvailability}
              isLoading={isLoading}
            />
          </div>
        )}

        {activeSection === 'appointments' && (
          <div className="space-y-6">
            {/* Filter Controls */}
           <div className="space-y-6">
  {/* Header with counts */}
  <div className="flex justify-between items-center bg-white rounded-xl shadow-lg p-6">
    <div>
      <h2 className="text-xl font-bold text-gray-800">Your Appointments</h2>
      <p className="text-gray-600">Manage your scheduled sessions</p>
    </div>
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
      <p className="text-blue-800 font-medium">
        {appointments.length} of {statusCounts.all} appointments
      </p>
    </div>
  </div>

  {/* Status Filter */}
  <div className="bg-white rounded-xl shadow-lg p-6">
    <h3 className="text-lg font-semibold text-gray-800 mb-4">Filter by Status</h3>
    <div className="flex flex-wrap gap-2">
      {[
        { value: 'all', label: 'All Appointments', count: statusCounts.all },
        { value: 'pending_approval', label: 'Pending Scheduling', count: statusCounts.pending_approval },
        { value: 'confirmed', label: 'Confirmed', count: statusCounts.confirmed },
        { value: 'completed', label: 'Completed', count: statusCounts.completed },
        { value: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled }
      ].map(option => (
        <button
          key={option.value}
          onClick={() => {
            setFilterStatus(option.value);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          disabled={option.count === 0}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterStatus === option.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } ${option.count === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {option.label} ({option.count})
        </button>
      ))}
    </div>
  </div>

  {/* Search and other filters */}
  <div className="bg-white rounded-xl shadow-lg p-6">
    <div className="flex flex-col md:flex-row gap-4 items-center">
      <div className="relative w-full md:w-[300px]">
        {isSearching ? (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-500" />
        ) : (
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
        )}
        <Input
          placeholder="Search patients by name, email, or phone..."
    value={searchTerm}
    onChange={(e) => {
      setSearchTerm(e.target.value);
      setPagination(prev => ({ ...prev, page: 1 }));
    }}
    className="pl-9"
  />
  {searchTerm && (
    <button 
      onClick={() => {
        setSearchTerm('');
        setPagination(prev => ({ ...prev, page: 1 }));
      }}
      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
    >
      <X className="h-4 w-4" />
    </button>
  )}
</div>

      <Popover open={showFilters} onOpenChange={setShowFilters}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilters.length > 0 && <Badge className="ml-1 bg-blue-600">{activeFilters.length}</Badge>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4">
          <div className="space-y-4">
            <h4 className="font-medium">Filter Appointments</h4>
            {/* <div className="space-y-2">
              <label className="text-sm font-medium">Plan</label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="Individual Session">Individual Session</SelectItem>
                  <SelectItem value="Package">Package</SelectItem>
                </SelectContent>
              </Select>
            </div> */}

            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <div className="grid gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.from && !dateRange.to && "text-muted-foreground",
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange?.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        "Select date range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={{
                        from: dateRange.from,
                        to: dateRange.to
                      }}
                      onSelect={(range) => setDateRange({
                        from: range?.from,
                        to: range?.to
                      })}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Clear Filters
              </Button>
              <Button size="sm" onClick={handleApplyFilters}>
                Apply Filters
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>

    {/* Active filters display */}
    {activeFilters.length > 0 && (
      <div className="flex flex-wrap gap-2 mt-4">
        {activeFilters.map((filter, index) => (
          <Badge key={index} variant="secondary" className="px-2 py-1 gap-1">
            {filter}
            <button onClick={() => handleRemoveFilter(filter)} className="ml-1 hover:text-red-500">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-xs h-7 px-2">
          Clear All
        </Button>
      </div>
    )}
  </div>
</div>


            {/* Appointments List */}
            {isLoading ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto" />
              </div>
            ) : appointments.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">No Appointments Found</h2>
                <p className="text-gray-600">
                  {searchTerm || activeFilters.length > 0
                    ? "No appointments match your search or filters"
                    : 'You have no appointments yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map(appointment => (
                  <div key={appointment._id} className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="relative h-12 w-12 rounded-full overflow-hidden bg-gray-100">
                          <Image
                            src={appointment.patient.image || "/assets/img/avatar.png"}
                            alt={appointment.patient.fullName}
                            className="object-cover"
                            width={48}
                            height={48}
                          />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{appointment.patient.fullName}</h3>
                          <p className="text-gray-600">{appointment.plan}</p>
                          {renderAppointmentDate(appointment)}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        {renderStatusBadge(appointment.status)}
                        {renderPaymentStatus(appointment)}
                      </div>
                    </div>

                    {/* Meeting Link Section */}
                    <div className="mt-4">
                      {(editingMeetingLink === appointment._id) ? (
                        <div className="flex gap-2">
                          <Input
                            value={meetingLinkInput}
                            onChange={(e) => setMeetingLinkInput(e.target.value)}
                            placeholder="Enter meeting link"
                            className="flex-1"
                          />
                          <Button 
                            onClick={() => handleSaveMeetingLink(appointment._id)}
                            disabled={isLoading}
                          >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setEditingMeetingLink(null);
                              setMeetingLinkInput('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {appointment.meetingLink ? (
                            <>
                              <span className="text-sm text-blue-600 truncate">{appointment.meetingLink}</span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  setEditingMeetingLink(appointment._id);
                                  setMeetingLinkInput(appointment.meetingLink || '');
                                }}
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setEditingMeetingLink(appointment._id)}
                            >
                              Add Meeting Link
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/dashboard/therapist/appointments/${appointment._id}`)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => copyToClipboard(appointment.patient.telephone)}
                        className="flex items-center gap-2"
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                      {appointment.stripePaymentStatus === 'unpaid' && (
                        <Button
                          variant="outline"
                          onClick={() => copyPaymentLink(appointment._id)}
                          className="flex items-center gap-2"
                        >
                          <Link className="w-4 h-4" />
                          Payment Link
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => handleEditAppointment(appointment._id)}
                        className="flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleCompleteAppointment(appointment)}
                        disabled={!appointment.stripeVerified && !appointment.isBalance}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Complete
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                <div className="flex items-center justify-between bg-white rounded-xl shadow-lg p-4">
                  <div className="text-sm text-gray-700">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.hasPrevPage}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.hasNextPage}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showEditDialog && editAppointmentId && (
        <EditAppointmentDialog
          appointmentId={editAppointmentId}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSuccess={fetchAppointments}
        />
      )}

      {showSessionModal && selectedSessionAppointment && (
        <SessionListPopup
          open={showSessionModal}
          onClose={() => setShowSessionModal(false)}
          sessions={sessionModalData}
          totalPrice={0}
          onSessionChange={fetchAppointments}
          appointmentId={selectedSessionAppointment._id}
          appointmentStatus={selectedSessionAppointment.status}
        />
      )}
    </div>
  );
};

interface AppointmentRequestCardProps {
  appointment: Appointment;
  onDecision: (appointmentId: string, decision: 'accept' | 'reject') => void;
  onSelect: (appointment: Appointment) => void;
  declineComment: string;
  setDeclineComment: (comment: string) => void;
  decision: 'accept' | 'reject' | null;
  setDecision: (decision: 'accept' | 'reject' | null) => void;
  isLoading: boolean;
}

const AppointmentRequestCard: React.FC<AppointmentRequestCardProps> = ({
  appointment,
  onDecision,
  onSelect,
  declineComment,
  setDeclineComment,
  decision,
  setDecision,
  isLoading,
}) => {
  const appointmentDate = new Date(appointment.date);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <h2 className="text-xl font-bold">New Appointment Request</h2>
        <p className="text-blue-100">A patient has requested an appointment</p>
      </div>
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <Image
                src={appointment.patient.image || '/assets/img/avatar.png'}
                alt={appointment.patient.fullName}
                width={48}
                height={48}
                className="rounded-full"
              />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">{appointment.patient.fullName}</h3>
              <p className="text-gray-600">{appointment.plan}</p>
              <div className="flex items-center mt-1 text-gray-500">
                <Clock className="w-4 h-4 mr-1" />
                <span className="text-sm">{formattedTime} on {formattedDate}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Would you like to accept this appointment?
          </h3>
          
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setDecision('accept')}
              disabled={isLoading}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
                decision === 'accept'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading && decision === 'accept' ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                'Accept'
              )}
            </button>
            <button
              onClick={() => setDecision('reject')}
              disabled={isLoading}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
                decision === 'reject'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              Decline
            </button>
          </div>

          {decision === 'accept' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-800 mb-4">
                By clicking "Confirm", the patient will be notified that the appointment is confirmed. 
                Please meet them on <strong>{formattedDate}</strong> at <strong>{formattedTime}</strong>.
              </p>
              <button
                onClick={() => onDecision(appointment._id, 'accept')}
                disabled={isLoading}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Confirm Appointment'
                )}
              </button>
            </div>
          )}

          {decision === 'reject' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">
                  The patient will be asked to rebook from your availability calendar.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for declining (optional)
                </label>
                <textarea
                  value={declineComment}
                  onChange={(e) => setDeclineComment(e.target.value)}
                  className="w-full border rounded-md p-2 text-sm"
                  rows={3}
                  placeholder="Provide a reason for declining this appointment..."
                />
              </div>

              <button
                onClick={() => onDecision(appointment._id, 'reject')}
                disabled={isLoading}
                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors w-full disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Confirm Decline'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface AvailabilitySectionProps {
  availability: AvailabilityDay[];
  isEditing: boolean;
  onToggleEdit: () => void;
  onToggleSlot: (day: string, time: string) => void;
  onSave: () => void;
  isLoading: boolean;
}

const AvailabilitySection: React.FC<AvailabilitySectionProps> = ({
  availability,
  isEditing,
  onToggleEdit,
  onToggleSlot,
  onSave,
  isLoading,
}) => {
  const [showAvailability, setShowAvailability] = useState(false);

  const isTimeSlotSelected = (day: string, time: string) => {
    const dayAvailability = availability.find(d => d.day === day);
    return dayAvailability ? dayAvailability.hours.includes(time) : false;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg">
      <div 
        className="p-6 border-b cursor-pointer flex justify-between items-center"
        onClick={() => setShowAvailability(!showAvailability)}
      >
        <div>
          <h2 className="text-xl font-bold text-gray-800">Your Availability</h2>
          <p className="text-gray-600">This is what patients see when rebooking</p>
        </div>
        <div className="flex items-center gap-2">
          {showAvailability && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isEditing) {
                  onSave();
                } else {
                  onToggleEdit();
                }
              }}
              disabled={isLoading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isEditing ? (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isLoading ? 'Saving...' : 'Save'}</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4" />
                  <span>Edit</span>
                </>
              )}
            </button>
          )}
          {showAvailability ? (
            <ChevronUp className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          )}
        </div>
      </div>
      
      {showAvailability && (
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-6">
              {daysOfWeek.map(day => (
                <div key={day} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    {day}
                  </h3>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {timeSlots.map(time => {
                      const isSelected = isTimeSlotSelected(day, time);
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => onToggleSlot(day, time)}
                          disabled={!isEditing || isLoading}
                          className={`p-2 rounded-lg text-sm font-medium transition-all ${
                            isSelected
                              ? isEditing
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-green-100 text-green-800'
                              : isEditing
                                ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                : 'bg-gray-100 text-gray-500'
                          } ${isEditing ? 'cursor-pointer' : 'cursor-default'} ${
                            isLoading ? 'opacity-70 cursor-not-allowed' : ''
                          }`}
                        >
                          {time}
                          {isEditing && (
                            <span className="block text-xs mt-1">
                              {isSelected ? 'Available' : 'Blocked'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TherapistDashboard;