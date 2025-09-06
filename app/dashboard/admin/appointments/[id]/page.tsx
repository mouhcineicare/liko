"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { User, Calendar, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

interface OnboardingResponse {
  questionId: string;
  question: string;
  answer: string | string[] | boolean;
  type: string;
}

interface AppointmentDetails {
  _id: string;
  patient: {
    _id: string;
    fullName: string;
    email: string;
    telephone: string;
    image: string | null;
  };
  therapist?: {
    _id: string;
    fullName: string;
    email: string;
    image: string | null;
    weeklyPatientsLimit: number;
    remainingWeeklySessions: number;
  };
  date: string;
  status: string;
  paymentStatus: string;
  plan: string;
  price: number;
  createdAt: string;
  oldTherapies: string[];
  onboarding?: {
    responses: OnboardingResponse[];
  };
  patientStats: {
    totalAppointments: number;
    completedAppointments: number;
    upcomingAppointments: number;
  };
  therapistStats?: {
    totalAppointments: number;
    completedAppointments: number;
    upcomingAppointments: number;
  };
  previousTherapists: Array<{
    _id: string;
    fullName: string;
    email: string;
    image: string | null;
    completedSessions: number;
  }>;
}

export default function AppointmentDetailsPage() {
  const params = useParams();
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchAppointmentDetails();
    }
  }, [params.id]);

  const fetchAppointmentDetails = async () => {
    try {
      const response = await fetch(`/api/admin/appointments/${params.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch appointment details");
      }
      const data = await response.json();
      setAppointment(data);
    } catch (error) {
      console.error("Error fetching appointment details:", error);
      toast.error("Failed to load appointment details");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "pending_approval":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Appointment Not Found</h2>
          <p className="text-gray-600 mt-2">The requested appointment could not be found.</p>
        </div>
      </div>
    );
  }

  const sessionProgress = appointment.therapist ? 
    ((appointment.therapist.weeklyPatientsLimit - appointment.therapist.remainingWeeklySessions) / appointment.therapist.weeklyPatientsLimit) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Appointment Details</h1>
        <div className="flex items-center space-x-3">
          <Badge className={getStatusColor(appointment.status)}>
            Therapy {appointment.status}
          </Badge>
          <Badge variant="outline" className={getStatusColor(appointment.paymentStatus)}>
            Pyment {appointment.paymentStatus}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Patient and Therapist Info */}
        <div className="lg:col-span-4 space-y-6">
          {/* Patient Information */}
          <Card className="p-6 bg-white">
            <h2 className="text-lg font-semibold mb-4">Patient Information</h2>
            <div className="flex items-start space-x-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={appointment.patient.image || undefined} />
                <AvatarFallback>
                  <User className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">{appointment.patient.fullName}</h3>
                <p className="text-sm text-gray-500">{appointment.patient.email}</p>
                <p className="text-sm text-gray-500">{appointment.patient.telephone}</p>
              </div>
            </div>
            {appointment.patientStats && (
              <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t">
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
          </Card>

          {/* Therapist Information */}
          <Card className="p-6 bg-white">
            <h2 className="text-lg font-semibold mb-4">Therapist Information</h2>
            {appointment.therapist ? (
              <>
                <div className="flex items-start space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={appointment.therapist.image || undefined} />
                    <AvatarFallback>
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">Dr. {appointment.therapist.fullName}</h3>
                    <p className="text-sm text-gray-500">{appointment.therapist.email}</p>
                  </div>
                </div>
                {appointment.therapistStats && (
                  <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-gray-500">Total Sessions</p>
                      <p className="text-lg font-semibold">{appointment.therapistStats.totalAppointments}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Completed</p>
                      <p className="text-lg font-semibold">{appointment.therapistStats.completedAppointments}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Upcoming</p>
                      <p className="text-lg font-semibold">{appointment.therapistStats.upcomingAppointments}</p>
                    </div>
                  </div>
                )}
                {/* Weekly Sessions Progress */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-gray-500">Remaining Patient</p>
                    <p className="text-sm font-medium">
                      {appointment.therapist?.remainingWeeklySessions | 0 } of {appointment.therapist?.weeklyPatientsLimit | 0} remaining
                    </p>
                  </div>
                  <Progress value={sessionProgress} className="h-2" />
                </div>
              </>
            ) : (
              <p className="text-gray-500">No therapist assigned</p>
            )}
          </Card>

          {/* Previous Therapists */}
          {appointment.previousTherapists?.length > 0 && (
            <Card className="p-6 bg-white">
              <h2 className="text-lg font-semibold mb-4">Previous Therapists</h2>
              <div className="space-y-4">
                {appointment.previousTherapists.map((therapist) => (
                  <div key={therapist._id} className="flex items-start space-x-4 pb-4 border-b last:border-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={therapist.image || undefined} />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">Dr. {therapist.fullName}</h3>
                      <p className="text-sm text-gray-500">{therapist.email}</p>
                      <p className="text-sm text-gray-500">
                        {therapist.completedSessions} completed sessions
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column - Appointment Details */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="p-6 bg-white">
            <h2 className="text-lg font-semibold mb-4">Appointment Details</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{format(new Date(appointment.date), "PPP")}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Time</p>
                  <p className="font-medium">{format(new Date(appointment.date), "p")}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Plan</p>
                <p className="font-medium">{appointment.plan}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Price</p>
                <p className="font-medium">د.إ{appointment.price}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created At</p>
                <p className="font-medium">{format(new Date(appointment.createdAt), "PPp")}</p>
              </div>
            </div>
          </Card>

          {/* Patient Onboarding */}
          {appointment.onboarding && (
            <Card className="p-6 bg-white">
              <h2 className="text-lg font-semibold mb-4">Patient Onboarding Information</h2>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {appointment.onboarding.responses.map((response, index) => (
                    <div key={index} className="pb-4 border-b border-gray-200 last:border-0">
                      <h3 className="font-medium text-gray-900 mb-2">{response.question}</h3>
                      {Array.isArray(response.answer) ? (
                        <ul className="list-disc list-inside space-y-1">
                          {response.answer.map((item, i) => (
                            <li key={i} className="text-gray-600">{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-600">
                          {typeof response.answer === 'boolean'
                            ? response.answer ? 'Yes' : 'No'
                            : response.answer}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}