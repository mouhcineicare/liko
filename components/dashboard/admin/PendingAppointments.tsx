"use client"

import { useState, useEffect } from "react"
import { Spin } from "antd"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { toast } from "sonner"
import DeclineCommentPopup from "./DeclineCommentPopup"
import { getStatusConfig, mapAppointmentStatus } from "@/lib/utils/statusMapping"
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

interface Appointment {
  _id: string
  patient: {
    fullName: string
  }
  therapist: {
    fullName: string
  }
  plan: string
  price: number
  date: string
  status: string
  declineComment?: string
}

interface ApiResponse {
  appointments: Appointment[]
  total: number
  page: number
  totalPages: number
}

export default function PendingAppointments() {
  const [data, setData] = useState<ApiResponse>({
    appointments: [],
    total: 0,
    page: 1,
    totalPages: 1,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [loadingAppointment, setLoadingAppointment] = useState<string | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showRevokeDialog, setShowRevokeDialog] = useState(false)
  const [showDeclineComment, setShowDeclineComment] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    fetchAppointments(currentPage)
  }, [currentPage])

  const fetchAppointments = async (page: number) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/appointments/pending?page=${page}&limit=${itemsPerPage}`)
      if (response.ok) {
        const data = await response.json()
        setData(data)
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
      fetchAppointments(currentPage)
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
    if (page >= 1 && page <= data.totalPages) {
      setCurrentPage(page)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin />
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border mb-4">
        <Spin spinning={loadingAppointment !== null} delay={300}>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-gray-700">Patient</TableHead>
                <TableHead className="text-gray-700">Assigned Therapist</TableHead>
                <TableHead className="text-gray-700">Plan</TableHead>
                <TableHead className="text-gray-700">Price</TableHead>
                <TableHead className="text-gray-700">Date & Time</TableHead>
                <TableHead className="text-gray-700">Status</TableHead>
                <TableHead className="text-gray-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.appointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-4">
                    No pending appointments found
                  </TableCell>
                </TableRow>
              ) : (
                data.appointments.map((appointment) => (
                  <TableRow key={appointment._id} className="hover:bg-gray-50">
                    <TableCell className="text-gray-900">{appointment.patient?.fullName || "Removed"}</TableCell>
                    <TableCell className="text-gray-900">Dr. {appointment.therapist?.fullName || "Removed"}</TableCell>
                    <TableCell className="text-gray-900">{appointment.plan}</TableCell>
                    <TableCell className="text-gray-900">د.إ{appointment.price}</TableCell>
                    <TableCell className="text-gray-900">{format(new Date(appointment.date), "PPp")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const mappedStatus = mapAppointmentStatus(appointment);
                          const statusConfig = getStatusConfig(mappedStatus);
                          return (
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusConfig.className}`}>
                              {statusConfig.label}
                            </span>
                          );
                        })()}
                        {appointment.declineComment && (
                          <span
                            className="cursor-pointer text-red-600 text-sm"
                            onClick={() => handleShowDeclineComment(appointment)}
                          >
                            Declined
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => confirmRevoke(appointment)}
                        className="bg-red-600 border-0 text-white hover:text-red-700 hover:bg-red-50"
                        disabled={loadingAppointment === appointment._id}
                      >
                        {loadingAppointment === appointment._id ? <Spin size="small" /> : "Revoke Assignment"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Spin>
      </div>

      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-sm text-gray-700">
          Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, data.total)} of{" "}
          {data.total} entries
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={data.total < 10}
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
              {loadingAppointment === selectedAppointment?._id ? <Spin size="small" /> : "Revoke Assignment"}
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
    </>
  )
}

