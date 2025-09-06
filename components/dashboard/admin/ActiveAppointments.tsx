"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"
import { toast } from "sonner"
import { useSearchParams, useRouter } from "next/navigation"
import { useMediaQuery } from "@/hooks/use-media-query"
import DeclineCommentPopup from "./DeclineCommentPopup"
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
import { Loader2, Trash2 } from "lucide-react"
import { Spin } from "antd"
import { getStatusConfig, mapAppointmentStatus } from "@/lib/utils/statusMapping"

interface Appointment {
  _id: string
  patient: {
    fullName: string
  }
  therapist: {
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

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export default function ActiveAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadingAppointment, setLoadingAppointment] = useState<string | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showRevokeDialog, setShowRevokeDialog] = useState(false)
  const [showDeclineComment, setShowDeclineComment] = useState(false)
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  })

  const searchParams = useSearchParams()
  const router = useRouter()
  const isMobile = useMediaQuery("(max-width: 768px)")
  const isTablet = useMediaQuery("(max-width: 1024px)")

  useEffect(() => {
    const page = searchParams.get("page") || "1"
    const limit = searchParams.get("limit") || "10"

    fetchAppointments(Number.parseInt(page), Number.parseInt(limit))
  }, [searchParams])

  const fetchAppointments = async (page: number, limit: number) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/appointments/active?page=${page}&limit=${limit}`)
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

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", newPage.toString())
    router.push(`?${params.toString()}`)
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
      fetchAppointments(pagination.page, pagination.limit)
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

  if (isLoading && appointments.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="default"  />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              {!isMobile && <TableHead className="text-gray-700">Created</TableHead>}
              <TableHead className="text-gray-700">Patient</TableHead>
              {!isMobile && <TableHead className="text-gray-700">Therapist</TableHead>}
              {!isTablet && <TableHead className="text-gray-700">Plan</TableHead>}
              <TableHead className="text-gray-700">Price</TableHead>
              <TableHead className="text-gray-700">Date</TableHead>
              <TableHead className="text-gray-700">Status</TableHead>
              <TableHead className="text-gray-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isMobile ? 5 : isTablet ? 6 : 8} className="text-center text-gray-500 py-4">
                  No active appointments found
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((appointment) => (
                <TableRow
                  key={appointment._id}
                  className={`hover:bg-gray-50 ${loadingAppointment === appointment._id ? "opacity-50" : ""}`}
                >
                  {!isMobile && (
                    <TableCell className="whitespace-nowrap">
                      <div>{format(new Date(appointment.createdAt), "MMM d")}</div>
                      <div className="text-xs text-gray-500">{format(new Date(appointment.createdAt), "h:mm a")}</div>
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap">{appointment.patient?.fullName || "Removed"}</TableCell>
                  {!isMobile && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={appointment.therapist?.image || "/assets/img/avatar.png"} />
                          <AvatarFallback>{appointment.therapist?.fullName?.charAt(0) || "T"}</AvatarFallback>
                        </Avatar>
                        <span className="whitespace-nowrap">Dr. {appointment.therapist?.fullName || "Removed"}</span>
                      </div>
                    </TableCell>
                  )}
                  {!isTablet && <TableCell className="whitespace-nowrap">{appointment.plan}</TableCell>}
                  <TableCell className="whitespace-nowrap">د.إ{appointment.price}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div>{format(new Date(appointment.date), "MMM d")}</div>
                    <div className="text-xs text-gray-500">{format(new Date(appointment.date), "h:mm a")}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const mappedStatus = mapAppointmentStatus(appointment);
                        const statusConfig = getStatusConfig(mappedStatus);
                        return (
                          <Badge className={statusConfig.className}>
                            {statusConfig.label}
                          </Badge>
                        );
                      })()}
                      {appointment.declineComment && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 p-0 h-auto"
                          onClick={() => handleShowDeclineComment(appointment)}
                        >
                          Declined
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => confirmRevoke(appointment)}
                      disabled={loadingAppointment === appointment._id}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {!isMobile && "Revoke"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.total > 0 && (
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="text-sm text-gray-700">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} appointments
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
      )}

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
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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

