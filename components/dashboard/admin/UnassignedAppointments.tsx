"use client"

import { useState, useEffect } from "react"
import { Spin } from "antd"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { format } from "date-fns"
import { getStatusConfig, mapAppointmentStatus } from "@/lib/utils/statusMapping"

interface Therapist {
  _id: string
  fullName: string
  hasReachedLimit?: boolean
  patientCount?: number
  patientLimit?: number
}

interface Appointment {
  _id: string
  patient: {
    fullName: string
  }
  plan: string
  price: number
  date: string
  status: string
  createdAt: string
  declineComment?: string
  oldTherapist?: {
    fullName: string
  }
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export default function UnassignedAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadingAppointment, setLoadingAppointment] = useState<string | null>(null)
  const [showDeclineComment, setShowDeclineComment] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [therapistLimits, setTherapistLimits] = useState<Record<string, boolean>>({})
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  })

  useEffect(() => {
    fetchAppointments()
    fetchTherapists()
  }, [pagination.page])

  const fetchAppointments = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(
        `/api/admin/appointments/unassigned?page=${pagination.page}&limit=${pagination.limit}`,
      )
      if (response.ok) {
        const data = await response.json()
        setAppointments(data.data)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error("Error fetching appointments:", error)
      toast.error("Failed to load appointments")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTherapists = async () => {
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
  }

  const checkTherapistLimit = async (therapistId: string) => {
    try {
      const response = await fetch(`/api/admin/therapists/${therapistId}`)
      if (response.ok) {
        const data = await response.json()

        // Update the therapist limits state
        setTherapistLimits((prev) => ({
          ...prev,
          [therapistId]: data.hasReachedLimit,
        }))

        // Update the therapist in the list with limit information
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
      fetchAppointments() // Refresh the list
    } catch (error) {
      console.error("Error assigning therapist:", error)
      toast.error("Failed to assign therapist")
    } finally {
      setLoadingAppointment(null)
    }
  }

  const handleShowDeclineComment = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowDeclineComment(true)
  }

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }))
  }

  const getStatusDisplay = (appointment: Appointment) => {
    const mappedStatus = mapAppointmentStatus(appointment);
    const statusConfig = getStatusConfig(mappedStatus);
    return statusConfig.label;
  }

  const getStatusColor = (appointment: Appointment) => {
    const mappedStatus = mapAppointmentStatus(appointment);
    const statusConfig = getStatusConfig(mappedStatus);
    return statusConfig.className;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin tip="Loading appointments..." />
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="text-gray-700">Created At</TableHead>
              <TableHead className="text-gray-700">Patient</TableHead>
              <TableHead className="text-gray-700">Plan</TableHead>
              <TableHead className="text-gray-700">Price</TableHead>
              <TableHead className="text-gray-700">Date</TableHead>
              <TableHead className="text-gray-700">Status</TableHead>
              <TableHead className="text-gray-700">Previous Therapist</TableHead>
              <TableHead className="text-gray-700">Assign To</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500 py-4">
                  No unassigned appointments found
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((appointment) => (
                <TableRow key={appointment._id} className="hover:bg-gray-50">
                  <TableCell className="text-gray-900 whitespace-nowrap">
                    <div className="font-medium">{format(new Date(appointment.createdAt), "MMM d, yyyy")}</div>
                    <div className="text-xs text-gray-500">{format(new Date(appointment.createdAt), "h:mm a")}</div>
                  </TableCell>
                  <TableCell className="text-gray-900">{appointment.patient?.fullName || "removed"}</TableCell>
                  <TableCell className="text-gray-900">{appointment.plan}</TableCell>
                  <TableCell className="text-gray-900">د.إ{appointment.price}</TableCell>
                  <TableCell className="text-gray-900">
                    {format(new Date(appointment.date), "MMM d, yyyy")}
                    <div className="text-xs text-gray-500">{format(new Date(appointment.date), "h:mm a")}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(appointment)}`}>
                        {getStatusDisplay(appointment)}
                      </span>
                      {appointment.declineComment && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleShowDeclineComment(appointment)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          View Reason
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-900">
                    {appointment.oldTherapist ? `Dr. ${appointment.oldTherapist.fullName}` : "None"}
                  </TableCell>
                  <TableCell>
                    <Select
                      onValueChange={(value) => handleAssignTherapist(appointment._id, value)}
                      disabled={loadingAppointment === appointment._id}
                    >
                      <SelectTrigger className="w-[220px] bg-white text-gray-900">
                        <SelectValue placeholder="Select therapist" />
                      </SelectTrigger>
                      <SelectContent>
                        {therapists.map((therapist) => (
                          <SelectItem
                            key={therapist._id}
                            value={therapist._id}
                            disabled={therapistLimits[therapist._id]}
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
                    {loadingAppointment === appointment._id && (
                      <div className="mt-2">
                        <Spin size="small" />
                      </div>
                    )}
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
        <Dialog open={showDeclineComment} onOpenChange={setShowDeclineComment}>
          <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader>
              <DialogTitle>Decline Reason</DialogTitle>
              <DialogDescription>
                {selectedAppointment.oldTherapist && (
                  <>
                    Dr. {selectedAppointment.oldTherapist.fullName} provided the following reason for declining this
                    appointment:
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-900 whitespace-pre-wrap">{selectedAppointment.declineComment}</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

