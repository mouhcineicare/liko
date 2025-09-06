"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"
import { toast } from "sonner"
import DeclineCommentPopup from "./DeclineCommentPopup"
import { Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Spin } from "antd"

interface Appointment {
  _id: string
  patient: {
    fullName: string
  }
  therapist: {
    _id: string
    fullName: string
    image?: string
  }
  plan: string
  price: number
  date: string
  status: string
  createdAt: string
  declineComment?: string
}

interface ApiResponse {
  data: Appointment[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export default function CompletedAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadingAppointment, setLoadingAppointment] = useState<string | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showRevokeDialog, setShowRevokeDialog] = useState(false)
  const [showDeclineComment, setShowDeclineComment] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  })

  useEffect(() => {
    fetchAppointments()
  }, [pagination.page])

  const fetchAppointments = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(
        `/api/admin/appointments/completed?page=${pagination.page}&limit=${pagination.limit}`,
      )
      if (response.ok) {
        const data: ApiResponse = await response.json()
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
      fetchAppointments()
    } catch (error) {
      console.error("Error revoking assignment:", error)
      toast.error("Failed to revoke assignment")
    } finally {
      setLoadingAppointment(null)
      setShowRevokeDialog(false)
      setSelectedAppointment(null)
    }
  }

  const confirmRevoke = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowRevokeDialog(true)
  }

  const handleShowDeclineComment = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowDeclineComment(true)
  }

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }))
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spin size="default" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="text-gray-700">Created At</TableHead>
              <TableHead className="text-gray-700">Patient</TableHead>
              <TableHead className="text-gray-700">Therapist</TableHead>
              <TableHead className="text-gray-700">Plan</TableHead>
              <TableHead className="text-gray-700">Price</TableHead>
              <TableHead className="text-gray-700">Appointment Date</TableHead>
              <TableHead className="text-gray-700">Status</TableHead>
              <TableHead className="text-gray-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500 py-4">
                  No completed appointments found
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((appointment) => (
                <TableRow
                  key={appointment._id}
                  className={`relative hover:bg-gray-50 ${loadingAppointment === appointment._id ? "opacity-60" : ""}`}
                >
                  {loadingAppointment === appointment._id && (
                    <TableCell
                      colSpan={8}
                      className="absolute inset-0 bg-white bg-opacity-50 backdrop-blur-sm flex items-center justify-center"
                    >
                      <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                    </TableCell>
                  )}
                  <TableCell className="text-gray-900 whitespace-nowrap">
                    <div className="font-medium">{format(new Date(appointment.createdAt), "MMM d, yyyy")}</div>
                    <div className="text-xs text-gray-500">{format(new Date(appointment.createdAt), "h:mm a")}</div>
                  </TableCell>
                  <TableCell className="text-gray-900">{appointment.patient?.fullName || "Removed"}</TableCell>
                  <TableCell className="text-gray-900">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={appointment.therapist?.image || "/assets/img/avatar.png"}
                          alt={appointment.therapist?.fullName || "Therapist"}
                        />
                        <AvatarFallback>{appointment.therapist?.fullName?.[0] || "T"}</AvatarFallback>
                      </Avatar>
                      <span>Dr. {appointment.therapist?.fullName || "Removed"}</span>
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
                      <Badge className="bg-green-100 text-green-800">{appointment.status}</Badge>
                      {appointment.declineComment && (
                        <span
                          className="text-red-600 cursor-pointer text-sm"
                          onClick={() => handleShowDeclineComment(appointment)}
                        >
                          Declined
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => confirmRevoke(appointment)}
                      disabled={loadingAppointment === appointment._id}
                    >
                      Revoke Assignment
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-sm text-gray-500">
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

      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this assignment? The appointment will be moved back to unassigned status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedAppointment && handleRevoke(selectedAppointment._id)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loadingAppointment === selectedAppointment?._id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revoking...
                </>
              ) : (
                "Revoke Assignment"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedAppointment && (
        <DeclineCommentPopup
          open={showDeclineComment}
          onOpenChange={setShowDeclineComment}
          comment={selectedAppointment.declineComment || ""}
          therapistName={selectedAppointment.therapist?.fullName || ""}
        />
      )}
    </div>
  )
}

