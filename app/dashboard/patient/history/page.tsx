"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { format } from "date-fns"
import { Calendar, Clock, User, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { CircularProgressbar, buildStyles } from "react-circular-progressbar"
import "react-circular-progressbar/dist/styles.css"
import { Skeleton } from "@/components/ui/skeleton"

interface Appointment {
  _id: string
  date: string
  status: string
  therapist: {
    fullName: string
    image: string
  } | null
  plan: string
  planType: string
  completedSessions: number
  totalSessions: number
  createdAt: string
}

export default function AppointmentHistoryPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAppointments()
  }, [])

  const fetchAppointments = async () => {
    try {
      const response = await fetch(`/api/patient/appointments/history?skip=${0}&limit=${100}`)
      if (response.ok) {
        const data = await response.json()
        // API now returns only completed appointments, no need for additional filtering
        setAppointments(data.appointments || [])
      }
    } catch (error) {
      console.error("Error fetching appointments:", error)
      toast.error("Failed to load appointment history")
    } finally {
      setIsLoading(false)
    }
  }

  const calculateProgress = (appointment: Appointment) => {
    const completedSessions = appointment.completedSessions || 0
    const totalSessions = appointment.totalSessions || 1
    const progress = (completedSessions / totalSessions) * 100
    return Math.min(progress, 100) // Ensure progress doesn't exceed 100%
  }

  // Skeleton card for loading state
  const renderAppointmentCardSkeleton = () => (
    <Card className="p-6 bg-white">
      <div className="flex items-start space-x-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-2 mt-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-3 w-28 mt-2" />
        </div>
      </div>
    </Card>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">Appointment History</h1>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-5 w-40" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <div key={`skeleton-${index}`}>{renderAppointmentCardSkeleton()}</div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Appointment History</h1>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Total Completed: {appointments.length}</span>
          </div>
        </div>
      </div>

      {appointments.length === 0 ? (
        <Card className="p-6 bg-white">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">No Completed Appointments</h3>
            <p className="mt-1 text-gray-500">Your completed appointments will appear here.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {appointments.map((appointment) => (
            <Card key={appointment._id} className="p-6 bg-white">
              <div className="flex items-start space-x-4">
                <div className="w-16">
                  <CircularProgressbar
                    value={calculateProgress(appointment)}
                    text={`${appointment.completedSessions || 0}/${appointment.totalSessions || 1}`}
                    styles={buildStyles({
                      textSize: "24px",
                      pathColor: "#22c55e",
                      textColor: "#22c55e",
                      trailColor: "#f3f4f6",
                    })}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">
                    {appointment.plan || "Unknown Plan"}
                  </h3>
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center text-sm text-gray-500">
                      <User className="h-4 w-4 mr-2" />
                      Dr. {appointment.therapist?.fullName || "Therapist Not Assigned"}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-2" />
                      {appointment.date ? format(new Date(appointment.date), "MMMM d, yyyy") : "Date Not Available"}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-2" />
                      {appointment.date ? format(new Date(appointment.date), "h:mm a") : "Time Not Available"}
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    Created on {appointment.createdAt ? format(new Date(appointment.createdAt), "MMM d, yyyy") : "Date Unknown"}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

