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
import { cn } from "@/lib/utils";

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
  date: string;
  status: string;
  paymentStatus: string;
  plan: string;
  price: number;
  createdAt: string;
  onboarding: {
    responses: OnboardingResponse[];
  } | null;
  patientStats: {
    totalAppointments: number;
    completedAppointments: number;
    upcomingAppointments: number;
  };
}
type DetailsProps = { appointmentId? : string;}
export default function AppointmentDetailsPage({appointmentId}: DetailsProps) {
  const params = useParams();
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAppointmentDetails();
  }, []);

  const fetchAppointmentDetails = async () => {
    try {
      const response = await fetch(`/api/therapist/appointments/${params.id || appointmentId}`);
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

  // Helper to get all sessions (main + recurring, with current session logic)
  const getAllSessions = () => {
    if (!appointment) return [];
    // If no recurring, only main session
    if (!(appointment as any).recurring || (appointment as any).recurring.length === 0) {
      return [{
        type: "main",
        date: appointment.date,
        status: appointment.status,
        idx: 0,
        isCurrent: true,
        isLast: true,
      }];
    }
    // Recurring exists: current session is appointment.date, others are in recurring
    const recurring = (appointment as any).recurring || [];
    // Completed sessions from recurring
    const completed = recurring.filter((r: any) => r.status === "completed");
    // Remaining sessions (not completed)
    const remaining = recurring.filter((r: any) => r.status !== "completed");
    // Current session is appointment.date
    const sessions = [
      {
        type: "current",
        date: appointment.date,
        status: appointment.status,
        idx: completed.length,
        isCurrent: true,
        isLast: remaining.length === 0,
      },
      ...completed.map((rec: any, idx: number) => ({
        type: "completed",
        date: rec.date,
        status: rec.status,
        idx,
        isCurrent: false,
        isLast: false,
      })),
      ...remaining.map((rec: any, idx: number) => ({
        type: "upcoming",
        date: rec.date,
        status: rec.status,
        idx: completed.length + 1 + idx,
        isCurrent: false,
        isLast: false,
      })),
    ];
    // Sort by date ascending
    sessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sessions;
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
        {/* Left Column - Patient Info */}
        <div className="lg:col-span-4">
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
        </div>

        {/* Right Column - Appointment Details and Onboarding */}
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
          {appointment.onboarding ? (
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
          ) : (
            <Card className="p-6 bg-white">
              <div className="text-center py-6">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No Onboarding Information</h3>
                <p className="text-gray-600 mt-2">
                  This patient has not completed the onboarding process yet.
                </p>
              </div>
            </Card>
          )}

          {/* Sessions List */}
          <Card className="p-6 bg-white">
            <h2 className="text-lg font-semibold mb-4">Sessions</h2>
            <div className="space-y-2">
              {getAllSessions().map((sess, idx) => {
                const isToday = new Date(sess.date).toDateString() === new Date("2025-06-02").toDateString();
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center justify-between p-3 rounded border",
                      sess.isCurrent ? "bg-blue-50 border-blue-400" : "bg-gray-50 border-gray-200"
                    )}
                  >
                    <div>
                      <span className="font-medium">{sess.isCurrent ? "Current Session" : sess.type === "completed" ? `Completed Session` : `Upcoming Session`}</span>
                      <span className="ml-2 text-gray-600">{format(new Date(sess.date), "PPP p")}</span>
                      {sess.isCurrent && <span className="ml-2 px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs">Current</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-semibold",
                        sess.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : sess.isCurrent
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-200 text-gray-600"
                      )}>
                        {sess.status === "completed" ? "Completed" : sess.isCurrent ? "In Progress" : "Upcoming"}
                      </span>

                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}