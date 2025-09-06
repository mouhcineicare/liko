"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Video, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth, endOfMonth } from "date-fns";
import AddMeetingLinkButton from "@/components/dashboard/therapist/AddMeetingLinkButton";

interface Appointment {
  _id: string;
  patient: {
    fullName: string;
    email: string;
  };
  date: string;
  status: string;
  paymentStatus: string;
  plan: string;
  price: number;
  meetingLink?: string;
}

export default function AppointmentsPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch appointments for the entire month
  const fetchAppointmentsForMonth = async (month: Date) => {
    setIsLoading(true);
    try {
      const start = format(startOfMonth(month), "yyyy-MM-dd");
      const end = format(endOfMonth(month), "yyyy-MM-dd");


      const response = await fetch(
        `/api/therapist/appointments/month?start=${start}&end=${end}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch appointments");
      }
      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Failed to load appointments");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch appointments for the current month on initial load
  useEffect(() => {
    fetchAppointmentsForMonth(currentMonth);
  }, [currentMonth]);

  // Handle month change in the calendar
  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date);
    fetchAppointmentsForMonth(date);
  };

  // Handle date change
  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  // Get appointments for the selected day
  const getDayAppointments = (date: Date) => {
    return appointments.filter(
      (apt) => format(new Date(apt.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    );
  };

  // Get days with appointments for calendar highlighting
  const getDaysWithAppointments = () => {
    return appointments.map((apt) => new Date(apt.date));
  };

  const createMeetingLink = async (appointmentId: string) => {
    try {
      const response = await fetch(`/api/therapist/appointments/${appointmentId}/meeting`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to create meeting");
      }

      const data = await response.json();

      setAppointments(
        appointments.map((apt) => (apt._id === appointmentId ? { ...apt, meetingLink: data.meetingLink } : apt)),
      );

      toast.success("Meeting link created and sent to patient");
    } catch (error) {
      console.error("Error creating meeting:", error);
      toast.error("Failed to create meeting link");
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
      case "in_progress":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending_approval":
        return "Pending Approval";
      case "in_progress":
        return "In Progress";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Skeleton loaders
  const renderCalendarSkeleton = () => (
    <Card className="p-4 bg-white border-gray-200">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-24" />
          <div className="flex space-x-1">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {/* Day names */}
          {[...Array(7)].map((_, i) => (
            <Skeleton key={`day-${i}`} className="h-4 w-8 mx-auto" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {/* Calendar days */}
          {[...Array(35)].map((_, i) => (
            <Skeleton key={`date-${i}`} className="h-9 w-9 rounded-full mx-auto" />
          ))}
        </div>
      </div>
    </Card>
  );

  const renderAppointmentsSkeleton = () => (
    <Card className="p-6 bg-white border-gray-200">
      <div className="space-y-4">
        <Skeleton className="h-6 w-64" />

        {/* Appointment skeletons */}
        {[...Array(3)].map((_, i) => (
          <div key={`apt-skeleton-${i}`} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-32" />
                <div className="mt-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-20 mt-1" />
                </div>
                <Skeleton className="h-4 w-24 mt-1" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-32 rounded" />
                  <Skeleton className="h-9 w-9 rounded" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">Appointments Calendar</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Calendar Section */}
        <div className="w-full md:w-[300px]">
          {isLoading ? (
            renderCalendarSkeleton()
          ) : (
            <Card className="p-4 bg-white border-gray-200">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateChange}
                numberOfMonths={1}
                // onMonthChange={handleMonthChange} // Handle month change
                className="rounded-md border"
                modifiers={{
                  hasAppointment: getDaysWithAppointments(), // Highlight days with appointments
                }}
                modifiersStyles={{
                  hasAppointment: {
                    fontWeight: "bold",
                    backgroundColor: "rgba(59, 130, 246, 0.1)", // Light gray background
                  },
                  selected: {
                    backgroundColor: "black",
                    color: "white",
                  },
                }}
              />
            </Card>
          )}
        </div>

        {/* Appointments Section */}
        <div className="flex-1">
          {isLoading ? (
            renderAppointmentsSkeleton()
          ) : (
            <Card className="p-6 bg-white border-gray-200">
              {selectedDate ? (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Appointments for {format(selectedDate, "MMMM d, yyyy")}
                  </h2>
                  {getDayAppointments(selectedDate).length > 0 ? (
                    getDayAppointments(selectedDate).map((appointment) => (
                      <div key={appointment._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                        {/* Appointment details */}
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                          <div>
                            <h3 className="font-medium text-gray-900">{appointment.patient.fullName}</h3>
                            <p className="text-sm text-gray-500">{appointment.patient.email}</p>
                            <div className="mt-2">
                              <p className="text-sm font-medium text-gray-900">{appointment.plan}</p>
                              <p className="text-sm text-gray-500">د.إ{appointment.price}</p>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">{format(new Date(appointment.date), "h:mm a")}</p>
                          </div>
                          <div className="flex flex-col sm:flex-row items-end gap-2">
                            <Badge variant="outline" className={getStatusColor(appointment.status)}>
                              {getStatusLabel(appointment.status)}
                            </Badge>
                            <div className="flex gap-2">
                              {appointment.status === "confirmed" && !appointment.meetingLink && (
                                <AddMeetingLinkButton appointmentId={appointment._id}/>
                              )}
                              {appointment.meetingLink && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(appointment.meetingLink)}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <Video className="h-4 w-4 mr-2" />
                                  <span className="hidden sm:inline">Join Meeting</span>
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/dashboard/therapist/appointments/${appointment._id}`)}
                                className="bg-blue-600 text-white hover:bg-blue-700"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No appointments scheduled for this day</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Select a date to view appointments</p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}