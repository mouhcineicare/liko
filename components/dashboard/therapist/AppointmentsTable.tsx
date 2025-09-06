"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Eye, Search, Edit, Filter, X, Calendar, Phone, CheckCircle, XCircle, Ban, HelpCircle, Link, Clock, User } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"
import { formatInTimeZone, toZonedTime } from "date-fns-tz"
import EditAppointmentDialog from "./EditAppointmentDialog"
import DeclineCommentPopup from "./DeclineCommentPopup"
import Image from "next/image"
import SessionListPopup from "@/components/dashboard/SessionListPopup"
import { normalizeAppointmentSessions } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip"
import { CreditCardOutlined } from "@ant-design/icons"

interface SessionObject {
  date: string;
  status: 'in_progress' | 'completed';
  payment: 'not_paid' | 'paid';
}

interface Appointment {
  _id: string
  date: string
  status: string
  paymentStatus: string
  plan: string
  price: number
  totalSessions: number
  completedSessions: number
  patientApproved: number | null
  isDateUpdated?: boolean
  isConfirmed: boolean
  hasPreferedDate: boolean
  patient: {
    _id: string
    fullName: string
    email: string
    telephone: string
    image?: string
  }
  therapist?: {
    _id: string
    fullName: string
    image: string
  }
  meetingLink?: string
  declineComment?: string
  recurring: SessionObject[];
  createdAt: string;
  patientTimezone: string;
  planType: string;
  stripePaymentStatus: string;
  stripeSubscriptionStatus?: string;
  isStripeActive: boolean;
  stripeVerified?: boolean;
  isBalance: boolean | null;
  checkoutSessionId: string | null;
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

type Props = {
  appointmentsData: Appointment[];
  pagination: Pagination;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onSearch: (term: string) => void;
  onFilterChange: (filters: { plan: string; dateFrom: Date; dateTo?: Date }) => void;
  refreshData: () => Promise<void>;
  isHistory?: boolean;
  isLoading: boolean;
  renderTabkeSkeleton: ()=> React.ReactElement;
  searchTerm: string;
}

export default function TherapistAppointmentsTable({
  appointmentsData = [],
  pagination,
  onPageChange,
  onLimitChange,
  onSearch,
  onFilterChange,
  refreshData,
  isHistory,
  renderTabkeSkeleton,
  isLoading,
  searchTerm
}: Props) {
  const router = useRouter()
  const { data: session } = useSession()
  const [loadingAppointment, setLoadingAppointment] = useState<string | null>(null)
  const [showDeclineComment, setShowDeclineComment] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editAppointmentId, setEditAppointmentId] = useState<string | null>(null)
  const [plans, setPlans] = useState<{title: string, type: string}[]>([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionModalData, setSessionModalData] = useState<SessionObject[]>([]);
  const [selectedSessionAppointment, setSelectedSessionAppointment] = useState<Appointment | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Filter states
  const [showFilters, setShowFilters] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>("")
  const [dateRange, setDateRange] = useState<{
    from: Date,
    to: Date | undefined
  }>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)), // Default to 1 month ago
    to: new Date(new Date().setMonth(new Date().getMonth() + 1)) // Default to 1 month ahead
  });
  const [activeFilters, setActiveFilters] = useState<string[]>([])

  const [declineComment, setDeclineComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch('/api/plans');
        if (response.ok) {
          const data = await response.json();
          setPlans(data);
        }
      } catch (error) {
        console.error("Error fetching plans:", error);
      }
    };
    fetchPlans();
  }, []);

 const handleSearchSubmit = (e: React.FormEvent) => {
  e.preventDefault(); // Prevent form submission behavior
  onSearch(searchTerm);
};

  const updateActiveFilters = () => {
    const filters: string[] = []

    if (selectedPlan) {
      filters.push(`Plan: ${selectedPlan}`)
    }

    if (dateRange.from) {
      const dateLabel = dateRange.to
        ? `Date: ${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`
        : `Date: From ${format(dateRange.from, "MMM d, yyyy")}`
      filters.push(dateLabel)
    } else if (dateRange.to) {
      filters.push(`Date: Until ${format(dateRange.to, "MMM d, yyyy")}`)
    }

    setActiveFilters(filters)
  }

  const applyFilters = () => {
    onFilterChange({
      plan: selectedPlan,
      dateFrom: dateRange.from,
      dateTo: dateRange.to
    });
    updateActiveFilters();
    setShowFilters(false);
  };

  const clearFilters = () => {
    setSelectedPlan("")
    setDateRange({ from: new Date(new Date().setMonth(new Date().getMonth() - 1)) , to: new Date(new Date().setMonth(new Date().getMonth() + 1)) })
    onFilterChange({
      plan: "",
      dateFrom: new Date(new Date().setMonth(new Date().getMonth() - 1)), // Default to 1 month ago
      dateTo: new Date(new Date().setMonth(new Date().getMonth() + 1)) // Default to 1 month ahead
    })
    setActiveFilters([])
    setShowFilters(false)
  }

  const removeFilter = (filter: string) => {
    if (filter.startsWith("Plan:")) {
      setSelectedPlan("")
      onFilterChange({
        plan: "",
        dateFrom: new Date(),
        dateTo: undefined
      })
    } else if (filter.startsWith("Date:")) {
      setDateRange({ from: new Date(), to: undefined })
      onFilterChange({
        plan: selectedPlan || "",
        dateFrom: new Date(),
        dateTo: undefined
      })
    }

    const newFilters = activeFilters.filter((f) => f !== filter)
    setActiveFilters(newFilters)
  }

  const handleEditAppointment = (appointmentId: string) => {
    setEditAppointmentId(appointmentId)
    setShowEditDialog(true)
  }

const convertAppointmentToPatientTimeZone = (
  appointment: Appointment,
  therapistTimezone: string = 'Asia/Dubai'
) => {
  try {
    // 1. Parse the appointment date (stored in patient's timezone)
    const patientDate = new Date(appointment.date);
    
    // 2. Convert to therapist's timezone
    const therapistZonedTime = toZonedTime(patientDate, therapistTimezone);
    
    // 3. Format for display
    const therapistFormattedDate = formatInTimeZone(
      therapistZonedTime, 
      therapistTimezone, 
      'yyyy-MM-dd HH:mm:ssXXX'
    );
    
    return {
      originalDate: appointment.date,
      therapistDate: format(new Date(therapistFormattedDate), "HH:mm"),
      therapistTimezone,
      patientTimezone: appointment.patientTimezone,
    };
    
  } catch (error) {
    console.error('Timezone conversion error:', error);
    return {
      originalDate: appointment.date,
      therapistDate: format(new Date(appointment.date), "HH:mm"), // fallback to original if conversion fails
      therapistTimezone,
      patientTimezone: appointment.patientTimezone,
      error: 'Conversion failed'
    };
  }
};

  const renderStripeStatus = (appointment: Appointment) => {
    if(appointment.isBalance){
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="flex items-center gap-1 bg-green-100 text-green-800">
                <CreditCardOutlined className="h-4 w-4" />
                <span>Balance Used</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>patient paid otherways and used balance for booking</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }
    
    if (!appointment?.checkoutSessionId) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="flex items-center gap-1">
                <CreditCardOutlined className="h-4 w-4" />
                <span>No Payment</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>No payment information found for this appointment</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (appointment.stripeVerified === false) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="destructive" className="flex items-center gap-1">
                <XCircle className="h-4 w-4" />
                <span>Verification Failed</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Failed to verify payment with Stripe</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (appointment.isStripeActive && appointment.stripeSubscriptionStatus === 'active') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                <span>Active Subscription</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Active subscription - recurring payments enabled</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (appointment.stripeSubscriptionStatus !== 'none' && !appointment.isStripeActive) {
      let statusText = appointment.stripeSubscriptionStatus?.toUpperCase() || 'INACTIVE';
      let badgeVariant: 'default' | 'destructive' | 'outline' | 'secondary' = 'secondary';
      
      if (appointment.stripeSubscriptionStatus === 'canceled') {
        statusText = 'CANCELED';
        badgeVariant = 'destructive';
      } else if (appointment.stripeSubscriptionStatus === 'past_due') {
        statusText = 'PAST DUE';
        badgeVariant = 'destructive';
      } else if (appointment.stripeSubscriptionStatus === 'unpaid') {
        statusText = 'UNPAID';
        badgeVariant = 'destructive';
      }

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant={badgeVariant} className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{statusText}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Subscription status: {appointment.stripeSubscriptionStatus}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (appointment.stripeVerified) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                <span>Paid</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>One-time payment verified</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Pending</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Payment verification in progress</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const isPaymentVerified = (appointment: Appointment): boolean => {
    return (
      appointment.isStripeActive || 
      appointment.stripePaymentStatus === 'paid' || 
      appointment.stripeVerified
    ) || appointment.isBalance || false;
  };

  const copyPaymentLinkToClipboard = (id: string) => {
    const paymentLink = `${process.env.NEXT_PUBLIC_BASE_URL}/payment?appointmentId=${id}`;
    navigator.clipboard
      .writeText(paymentLink)
      .then(() => {
        toast.success("Payment link copied to clipboard")
      })
      .catch((err) => {
        console.error("Failed to copy: ", err)
        toast.error("Failed to copy phone number")
      })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success("Phone number copied to clipboard")
      })
      .catch((err) => {
        console.error("Failed to copy: ", err)
        toast.error("Failed to copy phone number")
      })
  }

  const handleOpenSessionModal = (appointment: Appointment) => {
    const sessions = normalizeAppointmentSessions(
      appointment.date,
      appointment.recurring,
      appointment.price,
      appointment.totalSessions
    );
    
    let sessionList: SessionObject[];
    if (appointment.recurring && appointment.recurring.length > 0) {
      sessionList = sessions;
    } else {
      sessionList = [sessions[0]]; // Only main session
    }
    setSessionModalData(sessionList);
    setSelectedSessionAppointment(appointment);
    setShowSessionModal(true);
  };

  // Filter appointments by status
  const filteredAppointments = filterStatus === 'all' 
    ? appointmentsData 
    : appointmentsData.filter(appointment => appointment.status === filterStatus);

  const statusOptions = [
    { value: 'all', label: 'All Appointments' },
    { value: 'pending_approval', label: 'Pending Scheduling' },
    { value: 'approved', label: 'Approved' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Your Appointments</h2>
            <p className="text-gray-600">Manage your scheduled sessions</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative w-full md:w-[250px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => onSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Date Filter */}
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Plan</label>
                    <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Plans</SelectItem>
                        {plans.map(plan => (
                          <SelectItem key={plan.type} value={plan.title}>
                            {plan.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Range</label>
                    <div className="grid gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dateRange.from && !dateRange.to && "text-muted-foreground",
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {dateRange.from ? (
                              dateRange.to ? (
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
                            selected={dateRange}
                            onSelect={(range) => setDateRange({ from: range?.from || new Date(), to: range?.to })}
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                    <Button size="sm" onClick={applyFilters}>
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Active filters display */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {activeFilters.map((filter, index) => (
              <Badge key={index} variant="secondary" className="px-2 py-1 gap-1">
                {filter}
                <button onClick={() => removeFilter(filter)} className="ml-1 hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7 px-2">
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Appointments Table */}
      {isLoading ? (
        renderTabkeSkeleton()
      ) : filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Appointments Found</h2>
          <p className="text-gray-600">
            {searchTerm || activeFilters.length > 0
              ? "No appointments match your search or filters"
              : "You don't have any appointments yet"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-gray-700">Patient</TableHead>
                <TableHead className="text-gray-700">Plan</TableHead>
                <TableHead className="text-gray-700">Date & Time</TableHead>
                <TableHead className="text-gray-700">Status</TableHead>
                <TableHead className="text-gray-700">Payment</TableHead>
                <TableHead className="text-gray-700 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppointments.map((appointment) => {
                const timeInfo = convertAppointmentToPatientTimeZone(appointment, session?.user?.timeZone);
                return (
                  <TableRow
                    key={appointment._id}
                    className={`
                      ${appointment.status === "rejected" ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"}
                      ${loadingAppointment === appointment._id ? "opacity-50" : ""}
                    `}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded-full overflow-hidden bg-gray-100">
                          <Image
                            src={appointment.patient.image || "/assets/img/avatar.png"}
                            alt={appointment.patient.fullName}
                            className="object-cover"
                            width={40}
                            height={40}
                          />
                        </div>
                        <div>
                          <div className="font-medium">{appointment.patient.fullName}</div>
                          <div className="text-sm text-gray-500">{appointment.patient.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{appointment.plan}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {format(new Date(appointment.date), "MMM d, yyyy")}
                        </span>
                        <span className="text-sm text-gray-500">
                          {timeInfo.therapistDate} ({appointment.patientTimezone})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "capitalize",
                        appointment.status === "completed" ? "bg-green-100 text-green-800" :
                        appointment.status === "cancelled" ? "bg-red-100 text-red-800" :
                        appointment.status === "matched_pending_therapist_acceptance" ? "bg-yellow-100 text-yellow-800" :
                        appointment.status === "confirmed" ? "bg-blue-100 text-blue-800" :
                        appointment.status === "in_progress" ? "bg-purple-100 text-purple-800" :
                        "bg-gray-100 text-gray-800"
                      )}>
                        {appointment.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {renderStripeStatus(appointment)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditAppointment(appointment._id)}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/therapist/appointments/${appointment._id}`)}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(appointment.patient.telephone)}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                        {appointment.stripePaymentStatus === "unpaid" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyPaymentLinkToClipboard(appointment._id.toString())}
                            className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                          >
                            <Link className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenSessionModal(appointment)}
                          disabled={!isPaymentVerified(appointment)}
                          className="text-purple-600 border-purple-200 hover:bg-purple-50 disabled:opacity-50"
                        >
                          Complete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-4 bg-white rounded-xl shadow-lg">
        <div className="text-sm text-gray-700">
          Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={!pagination.hasPrevPage}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={!pagination.hasNextPage}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Modals */}
      {selectedAppointment && (
        <DeclineCommentPopup
          open={showDeclineComment}
          onOpenChange={setShowDeclineComment}
          comment={selectedAppointment.declineComment || ""}
        />
      )}

      {editAppointmentId && (
        <EditAppointmentDialog
          appointmentId={editAppointmentId}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSuccess={refreshData}
        />
      )}

      <SessionListPopup
        open={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        sessions={sessionModalData.map((s, idx) => ({
          _id: `${idx}`,
          date: s.date,
          status: s.status,
          price: selectedSessionAppointment?.price || 0,
          isCurrent: idx === 0,
        }))}
        totalPrice={selectedSessionAppointment?.price || 0}
        onSessionChange={refreshData}
        appointmentId={selectedSessionAppointment?._id || ""}
        appointmentStatus={selectedSessionAppointment?.status}
      />
    </div>
  );
}