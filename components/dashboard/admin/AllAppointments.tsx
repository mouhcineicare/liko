"use client"

import { useState, useEffect, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Eye, Search, Trash2, Edit, Filter, X, Calendar, LucideRefreshCcw, CheckCircle, XCircle, Ban, HelpCircle, SubscriptIcon } from "lucide-react"
import DeclineCommentPopup from "./DeclineCommentPopup"
import EditAppointmentDialog from "./EditAppointmentDialog"
import Image from "next/image"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Spin } from "antd"
import ViewSessionsDialog from "./ViewSessionsDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip"
import { FaBalanceScale, FaBalanceScaleLeft, FaSubscript, FaWallet } from "react-icons/fa"
import PaymentLinkModal from "./PaymentLinkModal"
import { getStatusConfig, mapAppointmentStatus } from "@/lib/utils/statusMapping"

interface SessionObject {
  date: string;
  status: 'in_progress' | 'completed';
  payment: 'not_paid' | 'paid';
}

interface Appointment {
  _id: string
  patient: {
    _id: string
    fullName: string
    stripeCustomerId?: string
    email:string
  }
  therapist?: {
    _id: string
    fullName: string
    image: string
  }
  plan: string
  price: number
  date: string
  status: string
  paymentStatus: "pending" | "completed" | "refunded" | "failed"
  createdAt: string
  declineComment?: string
  recurring: SessionObject[];
  stripePaymentStatus?: string;
  checkoutSessionId?: string;
  stripeSubscriptionStatus?: string;
  isBalance: boolean | null;
}

interface Therapist {
  _id: string
  fullName: string
  hasReachedLimit?: boolean
  patientCount?: number
  patientLimit?: number
}

interface Plan {
  _id: string
  title: string
  price: number
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
  isRefresh: boolean;
  setIsMatched: (v: boolean) => void;
}

export default function AllAppointments({isRefresh = false, setIsMatched}: Props) {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [showDeclineComment, setShowDeclineComment] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [loadingAppointment, setLoadingAppointment] = useState<string | null>(null)
  const [therapistLimits, setTherapistLimits] = useState<Record<string, boolean>>({})
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  })
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editAppointmentId, setEditAppointmentId] = useState<string | null>(null)
  const [isRotate, setIsRoatate] = useState(false);
  const [showViewSessionsDialog, setShowViewSessionsDialog] = useState(false);

  // Filter states
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTherapist, setSelectedTherapist] = useState<string>("")
  const [selectedPlan, setSelectedPlan] = useState<string>("")
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: undefined,
    to: undefined,
  })
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false)
  const [selectedAppointmentForPayment, setSelectedAppointmentForPayment] = useState<Appointment | null>(null)


const handleLinkPayment = async (appointmentId: string, paymentId: string) => {
  setLoadingAppointment(appointmentId)
  try {
    const response = await fetch(`/api/admin/appointments/${appointmentId}/link-payment`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentId })
    })

    if (!response.ok) {
      throw new Error('Failed to link payment')
    }

    toast.success('Payment linked successfully')
    fetchAppointments(pagination.page, pagination.limit, searchTerm)
  } catch (error) {
    console.error('Error linking payment:', error)
    toast.error('Failed to link payment')
  } finally {
    setLoadingAppointment(null)
  }
}

  const fetchTherapists = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/therapists")
      if (response.ok) {
        const data = await response.json()
        setTherapists(data)

        // Check limits for each therapist
        data.forEach((therapist: Therapist) => {
          checkTherapistLimit(therapist._id)
        })
      }
    } catch (error) {
      console.error("Error fetching therapists:", error)
      toast.error("Failed to load therapists")
    }
  }, [])

  const fetchPlans = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/plans")
      if (response.ok) {
        const data = await response.json()
        setPlans(data)
      }
    } catch (error) {
      console.error("Error fetching plans:", error)
      toast.error("Failed to load plans")
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAppointments(pagination.page, pagination.limit, searchTerm)
      fetchTherapists()
      fetchPlans()
    }, 500)

    return () => clearTimeout(timer)
  }, [pagination.page, pagination.limit, searchTerm, isRefresh])


const getPaymentIcon = (status: string, isSubscription: boolean = false, isBalance: boolean) => {

  if(isBalance){
     return { 
      icon: <FaWallet className="h-5 w-5 text-green-500" />, 
      tooltip: 'Balance Used' 
    };
  }

  if (isSubscription) {
    return { 
      icon: <FaSubscript className="h-5 w-5 text-green-500" />, 
      tooltip: 'Subscription Active' 
    };
  }

  switch (status) {
    case 'paid':
      return { icon: <CheckCircle className="h-5 w-5 text-green-500" />, tooltip: 'Paid' };
    case 'unpaid':
      return { icon: <XCircle className="h-5 w-5 text-red-500" />, tooltip: 'Unpaid' };
    case 'no_payment_required':
      return { icon: <Ban className="h-5 w-5 text-gray-500" />, tooltip: 'No payment required' };
    default:
      return { icon: <HelpCircle className="h-5 w-5 text-yellow-500" />, tooltip: 'Payment status unknown' };
  }
};

const getPaymenStatus = (status: string, isSubscription: boolean = false) => {
  if (isSubscription) {
    return true;
  }

  if(status === 'paid'){
    return true;
  }

  return false;
};

  const fetchAppointments = async (page: number, limit: number, query = "") => {
    try {
      setIsRoatate(true);
      setIsLoading(true)
      if(setIsMatched) setIsMatched(false);

      // Build the URL with filters
      let url = `/api/admin/appointments/all/filter?page=${page}&limit=${limit}`

      if (query) {
        url += `&search=${encodeURIComponent(query)}`
      }

      if (selectedTherapist) {
        url += `&therapist=${selectedTherapist}`
      }

      if (selectedPlan) {
        url += `&plan=${encodeURIComponent(selectedPlan)}`
      }

      if (dateRange.from) {
        url += `&startDate=${dateRange.from.toISOString().split("T")[0]}`
      }

      if (dateRange.to) {
        url += `&endDate=${dateRange.to.toISOString().split("T")[0]}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Failed to fetch appointments")
      }

      const data = await response.json()
      setAppointments(data.data)
      setPagination(data.pagination)

      // Update active filters
      updateActiveFilters()
    } catch (error) {
      console.error("Error fetching appointments:", error)
      toast.error("Failed to load appointments")
    } finally {
      setIsLoading(false)
      setTimeout(() => {
        setIsRoatate(false);
      }, 1000);
    }
  }

  const updateActiveFilters = () => {
    const filters: string[] = []

    if (selectedTherapist) {
      const therapist = therapists.find((t) => t._id === selectedTherapist)
      if (therapist) {
        filters.push(`Therapist: ${therapist.fullName}`)
      }
    }

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
    setPagination((prev) => ({ ...prev, page: 1 })) // Reset to first page
    fetchAppointments(1, pagination.limit, searchTerm)
    setShowFilters(false)
  }

  const clearFilters = () => {
    setSelectedTherapist("")
    setSelectedPlan("")
    setDateRange({ from: undefined, to: undefined })
    setPagination((prev) => ({ ...prev, page: 1 })) // Reset to first page

    // Always fetch after clearing filters, don't check activeFilters length
    setActiveFilters([])
    fetchAppointments(1, pagination.limit, searchTerm)
    setShowFilters(false)
  }

  const removeFilter = (filter: string) => {
    if (filter.startsWith("Therapist:")) {
      setSelectedTherapist("")
    } else if (filter.startsWith("Plan:")) {
      setSelectedPlan("")
    } else if (filter.startsWith("Date:")) {
      setDateRange({ from: undefined, to: undefined })
    }

    // Update active filters and refetch
    const newFilters = activeFilters.filter((f) => f !== filter)
    setActiveFilters(newFilters)
    fetchAppointments(1, pagination.limit, searchTerm)
  }

  const checkTherapistLimit = async (therapistId: string) => {
    try {
      const response = await fetch(`/api/admin/therapists/${therapistId}`)
      if (response.ok) {
        const data = await response.json()
        setTherapistLimits((prev) => ({
          ...prev,
          [therapistId]: data.hasReachedLimit,
        }))
        setTherapists((prev) =>
          prev.map((t) =>
            t._id === therapistId
              ? {
                  ...t,
                  hasReachedLimit: data.hasReachedLimit,
                  patientCount: data.patientCount,
                  patientLimit: data.patientLimit,
                }
              : t,
          ),
        )
      }
    } catch (error) {
      console.error(`Error checking therapist limit for ${therapistId}:`, error)
    }
  }

  const handleAssignTherapist = async (appointmentId: string, therapistId: string) => {
    setLoadingAppointment(appointmentId)
    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}/assign`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ therapistId }),
      })

      if (!response.ok) {
        throw new Error("Failed to assign therapist")
      }

      toast.success("Therapist assigned successfully")
      fetchAppointments(pagination.page, pagination.limit, searchTerm)
    } catch (error) {
      console.error("Error assigning therapist:", error)
      toast.error("Failed to assign therapist")
    } finally {
      setLoadingAppointment(null)
    }
  }

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to delete this appointment?")) return

    setLoadingAppointment(appointmentId)
    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete appointment")
      }

      toast.success("Appointment deleted successfully")
      fetchAppointments(pagination.page, pagination.limit, searchTerm)
    } catch (error) {
      console.error("Error deleting appointment:", error)
      toast.error("Failed to delete appointment")
    } finally {
      setLoadingAppointment(null)
    }
  }

  const handleRevoke = async (appointmentId: string) => {
    setLoadingAppointment(appointmentId)
    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}/revoke`, {
        method: "PUT",
      })

      if (!response.ok) {
        throw new Error("Failed to revoke assignment")
      }

      toast.success("Assignment revoked successfully")
      fetchAppointments(pagination.page, pagination.limit, searchTerm)
    } catch (error) {
      console.error("Error revoking assignment:", error)
      toast.error("Failed to revoke assignment")
    } finally {
      setLoadingAppointment(null)
    }
  }

  const handleShowDeclineComment = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowDeclineComment(true)
  }

  const handleEditAppointment = (appointmentId: string) => {
    setEditAppointmentId(appointmentId)
    setShowEditDialog(true)
  }

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }))
  }

  const handleItemsPerPageChange = (value: string) => {
    const newLimit = Number.parseInt(value)
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }))
    fetchAppointments(1, newLimit, searchTerm)
  }

  const getStatusColor = (appointment: Appointment) => {
    const mappedStatus = mapAppointmentStatus(appointment);
    const statusConfig = getStatusConfig(mappedStatus);
    return statusConfig.className;
  }

  const getStatusLabel = (appointment: Appointment) => {
    const mappedStatus = mapAppointmentStatus(appointment);
    const statusConfig = getStatusConfig(mappedStatus);
    return statusConfig.label;
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "refunded":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handlePaymentStatusChange = async (appointmentId: string, newStatus: string) => {
    setLoadingAppointment(appointmentId)
    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}/paymentStatus`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentStatus: newStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update payment status")
      }

      toast.success("Payment status updated successfully")
      fetchAppointments(pagination.page, pagination.limit, searchTerm)
    } catch (error) {
      console.error("Error updating payment status:", error)
      toast.error("Failed to update payment status")
    } finally {
      setLoadingAppointment(null)
    }
  }

  const handleOpenViewSessionsDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowViewSessionsDialog(true);
  };

  if (isLoading && appointments.length === 0) {
    return <div className="flex items-center justify-center min-h-[200px]">
      <Spin size="default" />
    </div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 sm:p-0 sm:mt-0 p-4 mt-5">
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by patient or therapist..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 bg-white text-gray-900"
            />
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Therapist</label>
                  <Select value={selectedTherapist} onValueChange={setSelectedTherapist}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select therapist" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Therapists</SelectItem>
                      {therapists.map((therapist) => (
                        <SelectItem key={therapist._id} value={therapist._id}>
                          Dr. {therapist.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Plan</label>
                  <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plans</SelectItem>
                      {plans.map((plan) => (
                        <SelectItem key={plan._id} value={plan.title}>
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
                          onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
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
        

  <div className="flex flex-row sm:justify-end space-x-2 w-full sm:w-1/2 justify-between flex-wrap">
      <Button
      onClick={() => fetchAppointments(pagination.page, pagination.limit, searchTerm)}
      className="bg-white-100 rounded-md hover:bg-white-200 transition-colors"
      variant="ghost"
      size="icon"
    >
      <LucideRefreshCcw
           className={`text-blue-600 text-sm transition-transform duration-1000 ${
             isRotate ? 'animate-spin' : ''}`}
      />
     </Button>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Items per page:</span>
          <select
            value={pagination.limit}
            onChange={(e) => handleItemsPerPageChange(e.target.value)}
            className="border rounded-md px-2 py-1 text-sm"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>
      </div>

      {/* Active filters display */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="text-gray-700">Stripe</TableHead>
              <TableHead className="text-gray-700">Created At</TableHead>
              <TableHead className="text-gray-700">Patient</TableHead>
              <TableHead className="text-gray-700">Therapist</TableHead>
              <TableHead className="text-gray-700">Plan</TableHead>
              <TableHead className="text-gray-700">Price</TableHead>
              <TableHead className="text-gray-700">Date</TableHead>
              <TableHead className="text-gray-700">Status</TableHead>
              <TableHead className="text-gray-700">Payment</TableHead>
              <TableHead className="text-gray-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-500 py-4">
                  {searchTerm || activeFilters.length > 0
                    ? "No appointments match your search or filters"
                    : "No appointments found"}
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((appointment) => (
                <TableRow
                  key={appointment._id}
                  className={`
                    relative
                    ${appointment.status === "rejected" ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"}
                    ${loadingAppointment === appointment._id ? "opacity-50" : ""}
                  `}
                >
                  {loadingAppointment === appointment._id && (
                    <TableCell
                      colSpan={9}
                      className="absolute inset-0 bg-white bg-opacity-50 backdrop-blur-sm flex items-center justify-center"
                    >
                      <Spin size="small" />
                    </TableCell>
                  )}
<TableCell className="text-gray-900">
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          {getPaymentIcon(
            appointment.stripePaymentStatus || 'unknown',
            appointment.stripeSubscriptionStatus === 'active',
            appointment.isBalance || false
          ).icon}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {appointment.stripeSubscriptionStatus === 'active' 
            ? 'Subscription Active' 
            : getPaymentIcon(appointment.stripePaymentStatus || 'unknown', false, appointment.isBalance || false).tooltip}
        </p>
        {appointment.checkoutSessionId && (
          <p className="text-xs mt-1">Session ID: {appointment.checkoutSessionId.substring(0, 8)}...</p>
        )}
        {appointment.stripeSubscriptionStatus && (
          <p className="text-xs mt-1">Subscription: {appointment.stripeSubscriptionStatus}</p>
        )}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</TableCell>
                  <TableCell className="text-gray-900 whitespace-nowrap">
                    <div className="font-medium">{format(new Date(appointment.createdAt), "MMM d, yyyy")}</div>
                    <div className="text-xs text-gray-500">{format(new Date(appointment.createdAt), "h:mm a")}</div>
                  </TableCell>
                  <TableCell className="text-gray-900">{appointment.patient?.fullName || "Removed"}</TableCell>
                  <TableCell className="text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="relative h-8 w-8 rounded-full overflow-hidden bg-gray-100">
                        <Image
                          src={appointment.therapist?.image || "/assets/img/avatar.png"}
                          alt={appointment.therapist?.fullName || "Therapist"}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <span>Dr. {appointment.therapist?.fullName || "Unassigned"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-900">{appointment.plan}</TableCell>
                  <TableCell className="text-gray-900">د.إ{appointment.price}</TableCell>
                  <TableCell className="text-gray-900 whitespace-nowrap">
                    <div className="font-medium">{format(new Date(appointment.date), "MMM d, yyyy")}</div>
                    <div className="text-xs text-gray-500">{format(new Date(appointment.date), "h:mm a")}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(appointment)}`}
                      >
                        {getStatusLabel(appointment)}
                      </span>
                      {appointment.status === "rejected" && appointment.declineComment && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleShowDeclineComment(appointment)}
                          className="text-red-600 hover:text-red-700 bg-red-50 text-xs"
                        >
                          See Reason
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={appointment.paymentStatus}
                      onValueChange={(value) => handlePaymentStatusChange(appointment._id, value)}
                      disabled={loadingAppointment === appointment._id}
                    >
                      <SelectTrigger className={`w-[120px] ${getPaymentStatusColor(appointment.paymentStatus)}`}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending" className="hover:bg-yellow-50">
                          Pending
                        </SelectItem>
                        <SelectItem value="completed" className="hover:bg-green-50">
                          Completed
                        </SelectItem>
                        <SelectItem value="refunded" className="hover:bg-red-50">
                          Refunded
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {!appointment.therapist ? (
                        <Select
                          onValueChange={(value) => handleAssignTherapist(appointment._id, value)}
                          disabled={loadingAppointment === appointment._id}
                        >
                          <SelectTrigger className="w-[180px] bg-white text-gray-900">
                            <SelectValue placeholder="Assign therapist" />
                          </SelectTrigger>
                          <SelectContent>
                            {therapists.map((therapist) => (
                              <SelectItem
                                key={therapist._id}
                                value={therapist._id}
                              >
                                Dr. {therapist.fullName}{" "}
                                {therapist.hasReachedLimit
                                  ? `(${therapist.patientCount}/${therapist.patientLimit} - Full)`
                                  : therapist.patientCount && therapist.patientLimit
                                    ? `(${therapist.patientCount}/${therapist.patientLimit})`
                                    : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevoke(appointment._id)}
                          className="bg-red-600 border-0 text-white hover:text-red-700 hover:bg-red-50"
                          disabled={loadingAppointment === appointment._id}
                        >
                          Revoke
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditAppointment(appointment._id)}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                        disabled={loadingAppointment === appointment._id}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/admin/appointments/${appointment._id}`)}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                        disabled={loadingAppointment === appointment._id}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAppointment(appointment._id)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={loadingAppointment === appointment._id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenViewSessionsDialog(appointment)}
                        className="bg-green-600 text-white hover:bg-green-700"
                        disabled={loadingAppointment === appointment._id}
                      >
                        Sessions
                      </Button>

                  {!getPaymenStatus(appointment.stripePaymentStatus || 'unknown',
                         appointment.stripeSubscriptionStatus === 'active') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAppointmentForPayment(appointment)
                          setShowPaymentLinkModal(true)
                        }}
                        className="bg-purple-600 text-white hover:bg-purple-700"
                      >
                        Link Payment
                  </Button>)}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-sm text-gray-700">
          Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={!pagination.hasPrevPage}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={!pagination.hasNextPage}
          >
            Next
          </Button>
        </div>
      </div>

      {selectedAppointment && (
        <DeclineCommentPopup
          open={showDeclineComment}
          onOpenChange={setShowDeclineComment}
          comment={selectedAppointment.declineComment || ""}
          therapistName={selectedAppointment.therapist?.fullName || ""}
        />
      )}

      {editAppointmentId && (
        <EditAppointmentDialog
          appointmentId={editAppointmentId}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSuccess={() => fetchAppointments(pagination.page, pagination.limit, searchTerm)}
        />
      )}

      <ViewSessionsDialog
        open={showViewSessionsDialog}
        onClose={() => setShowViewSessionsDialog(false)}
        appointment={selectedAppointment}
      />

  {selectedAppointmentForPayment && (
    <PaymentLinkModal
      open={showPaymentLinkModal}
      onOpenChange={setShowPaymentLinkModal}
      patientId={selectedAppointmentForPayment.patient._id}
      onSelectPayment={(paymentId) => 
        handleLinkPayment(selectedAppointmentForPayment._id, paymentId)
      }
      currentSessionId={selectedAppointmentForPayment.checkoutSessionId}
      customerId={selectedAppointmentForPayment.patient.stripeCustomerId || ''}
      email={selectedAppointmentForPayment.patient.email || ''}
    />
)}
    </div>
  )
}

