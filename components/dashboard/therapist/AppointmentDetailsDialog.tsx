"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { User, Calendar, Clock, AlertCircle, Phone, Mail } from "lucide-react"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

interface OnboardingResponse {
  questionId: string
  question: string
  answer: string | string[] | boolean
  type: string
}

interface AppointmentDetails {
  _id: string
  patient: {
    _id: string
    fullName: string
    email: string
    telephone: string
    image: string | null
  }
  date: string
  status: string
  paymentStatus: string
  plan: string
  price: number
  createdAt: string
  onboarding: {
    responses: OnboardingResponse[]
  } | null
  patientStats: {
    totalAppointments: number
    completedAppointments: number
    upcomingAppointments: number
  }
}

interface AppointmentDetailsDialogProps {
  isOpen: boolean
  onClose: () => void
  appointmentId: string
}

export default function AppointmentDetailsDialog({ isOpen, onClose, appointmentId }: AppointmentDetailsDialogProps) {
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isOpen && appointmentId) {
      fetchAppointmentDetails()
    }
  }, [isOpen, appointmentId])

  const fetchAppointmentDetails = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/therapist/appointments/${appointmentId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch appointment details")
      }
      const data = await response.json()
      setAppointment(data)
    } catch (error) {
      console.error("Error fetching appointment details:", error)
      toast.error("Failed to load appointment details")
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "pending_approval":
        return "bg-yellow-100 text-yellow-800"
      case "approved":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-auto bg-white p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl">Appointment Details</DialogTitle>
          {!isLoading && appointment && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge className={getStatusColor(appointment.status)}>{appointment.status.replace("_", " ")}</Badge>
              <Badge variant="outline" className={getStatusColor(appointment.paymentStatus)}>
                {appointment.paymentStatus}
              </Badge>
            </div>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !appointment ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Appointment Not Found</h3>
            <p className="text-gray-600 mt-2">The requested appointment could not be found.</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <Tabs defaultValue="details" className="w-full">
              <div className="px-6">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="details">Appointment Details</TabsTrigger>
                  <TabsTrigger value="responses">Patient Responses</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="details" className="p-6 pt-2 space-y-6 overflow-auto max-h-[calc(80vh-120px)]">
                {/* Patient Info Card */}
                <Card className="p-6 bg-white">
                  <h2 className="text-lg font-semibold mb-4">Patient Information</h2>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={appointment.patient.image || undefined} />
                      <AvatarFallback>
                        <User className="h-8 w-8" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-3 flex-1">
                      <div>
                        <h3 className="text-lg font-medium">{appointment.patient.fullName}</h3>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-700">{appointment.patient.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-700">{appointment.patient.telephone}</span>
                        </div>
                      </div>

                      {appointment.patientStats && (
                        <div className="grid grid-cols-3 gap-4 pt-3 border-t mt-3">
                          <div>
                            <p className="text-sm text-gray-500">Total Sessions</p>
                            <p className="text-lg font-semibold">{appointment.patientStats.totalAppointments}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Completed</p>
                            <p className="text-lg font-semibold">{appointment.patientStats.completedAppointments}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Upcoming</p>
                            <p className="text-lg font-semibold">{appointment.patientStats.upcomingAppointments}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Appointment Details Card */}
                <Card className="p-6 bg-white">
                  <h2 className="text-lg font-semibold mb-4">Appointment Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-50 p-3 rounded-full">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Date</p>
                        <p className="font-medium text-gray-900">
                          {format(new Date(appointment.date), "EEEE, MMMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-50 p-3 rounded-full">
                        <Clock className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Time</p>
                        <p className="font-medium text-gray-900">{format(new Date(appointment.date), "h:mm a")}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-50 p-3 rounded-full">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Created On</p>
                        <p className="font-medium text-gray-900">
                          {format(new Date(appointment.createdAt), "MMMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-green-50 p-3 rounded-full">
                        <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Price</p>
                        <p className="font-medium text-gray-900">د.إ{appointment.price}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-medium mb-3">Plan Details</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-lg font-medium text-gray-900">{appointment.plan}</p>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="responses">
                {appointment.onboarding ? (
                  <div className="p-6 pt-2 overflow-auto max-h-[calc(80vh-120px)]">
                    <Card className="p-6 bg-white">
                      <h2 className="text-lg font-semibold mb-4">Patient Onboarding Responses</h2>
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-6">
                          {appointment.onboarding.responses.map((response, index) => (
                            <div key={index} className="pb-4 border-b border-gray-200 last:border-0">
                              <h3 className="font-medium text-gray-900 mb-2">{response.question}</h3>
                              {Array.isArray(response.answer) ? (
                                <ul className="list-disc list-inside space-y-1">
                                  {response.answer.map((item, i) => (
                                    <li key={i} className="text-gray-600">
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-gray-600">
                                  {typeof response.answer === "boolean"
                                    ? response.answer
                                      ? "Yes"
                                      : "No"
                                    : response.answer}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </Card>
                  </div>
                ) : (
                  <div className="p-6 pt-2">
                    <Card className="p-6 bg-white">
                      <div className="text-center py-12">
                        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No Onboarding Information</h3>
                        <p className="text-gray-600 mt-2">This patient has not completed the onboarding process yet.</p>
                      </div>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end p-6 pt-0">
              <Button onClick={onClose} className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

