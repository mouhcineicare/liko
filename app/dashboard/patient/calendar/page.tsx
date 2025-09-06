"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Appointment {
  _id: string;
  date: string;
  status: string;
  paymentStatus: string;
  therapist: {
    fullName: string;
  };
  plan: string;
}

interface CalendarDay {
  date: Date;
  appointments: Appointment[];
}

export default function PatientCalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await fetch("/api/patient/appointments");
      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDayAppointments = (date: Date) => {
    return appointments.filter(
      (apt) => format(new Date(apt.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Appointments Calendar</h1>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
        <Card className="p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
            modifiers={{
              hasAppointment: (date) => getDayAppointments(date).length > 0,
            }}
            modifiersStyles={{
              hasAppointment: {
                fontWeight: "bold",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
              },
            }}
          />
        </Card>

        <Card className="p-6">
          {isLoading ? (
            <div className="text-center py-4">Loading appointments...</div>
          ) : selectedDate ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Appointments for {format(selectedDate, "MMMM d, yyyy")}
              </h2>
              {getDayAppointments(selectedDate).length > 0 ? (
                getDayAppointments(selectedDate).map((appointment) => (
                  <div
                    key={appointment._id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">
                          Session with Dr. {appointment.therapist.fullName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {format(new Date(appointment.date), "h:mm a")}
                        </p>
                        <p className="text-sm text-gray-500">{appointment.plan}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={getStatusColor(appointment.status)}
                      >
                        {appointment.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No appointments scheduled for this day
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              Select a date to view appointments
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}