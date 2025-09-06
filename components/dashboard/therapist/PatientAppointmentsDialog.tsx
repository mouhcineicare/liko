"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { format } from "date-fns"
import { CalendarClock, Clock, FileText } from "lucide-react"

interface Appointment {
  _id: string
  date: string
  plan: string
  price: number
  status: string
  paymentStatus: string
  completedSessions: number
  totalSessions: number
  therapyType: string
}

interface PatientAppointmentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: string
  patientName: string
}

export function PatientAppointmentsDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
}: PatientAppointmentsDialogProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (open && patientId) {
      fetchAppointments()
    }
  }, [open, patientId])

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/therapist/appointments/patient/${patientId}`); // Ensure patientId is passed in the URL
      if (!response.ok) {
        throw new Error("Failed to fetch appointments");
      }
      const data = await response.json();
      setAppointments(data.data); // Ensure you're accessing the correct data property
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Failed to load appointments");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 hover:bg-green-100"
      case "cancelled":
        return "bg-red-100 text-red-800 hover:bg-red-100"
      case "pending":
      case "pending_approval":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
      case "approved":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100"
      case "in_progress":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100"
    }
  }

  const getPaymentStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 hover:bg-green-100"
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
      case "failed":
        return "bg-red-100 text-red-800 hover:bg-red-100"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100"
    }
  }

  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const renderTableRowSkeleton = () => (
    <TableRow>
      <TableCell>
        <Skeleton className="h-5 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-20" />
      </TableCell>
    </TableRow>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center">
            <CalendarClock className="mr-2 h-5 w-5 text-blue-600" />
            Appointments for {patientName}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-md border border-gray-200 mt-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-gray-900">Date & Time</TableHead>
                <TableHead className="text-gray-900">Plan</TableHead>
                <TableHead className="text-gray-900">Status</TableHead>
                <TableHead className="text-gray-900">Price</TableHead>
                <TableHead className="text-gray-900">Sessions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Skeleton rows
                <>{[...Array(3)].map((_, index) => renderTableRowSkeleton())}</>
              ) : appointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                    No appointments found for this patient
                  </TableCell>
                </TableRow>
              ) : (
                appointments.map((appointment) => (
                  <TableRow key={appointment._id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {format(new Date(appointment.date), "MMM d, yyyy")}
                        </span>
                        <span className="text-sm text-gray-500 flex items-center mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(new Date(appointment.date), "h:mm a")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{appointment.plan}</span>
                        <span className="text-sm text-gray-500">{appointment.therapyType}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge className={`${getStatusBadgeColor(appointment.status)} font-normal`}>
                          {formatStatus(appointment.status)}
                        </Badge>
                        <Badge className={`${getPaymentStatusBadgeColor(appointment.paymentStatus)} font-normal`}>
                          Payment: {formatStatus(appointment.paymentStatus)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-gray-900">
                        <span className="text-gray-500 mr-1">AED</span>
                        {appointment.price}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-gray-900">
                        <FileText className="h-4 w-4 text-gray-500 mr-1" />
                        {appointment.completedSessions}/{appointment.totalSessions}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-white text-gray-900 border-gray-200"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

