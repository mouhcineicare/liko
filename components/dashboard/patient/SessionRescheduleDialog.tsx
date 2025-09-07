'use client'

import { useState, useEffect, useRef } from "react";
import {
  Modal,
  Card,
  Button,
  Spin,
  Typography,
  Row,
  Col,
  Grid
} from "antd";
import { format, addDays, isSameDay, isAfter, parseISO } from "date-fns";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { convertToUAETime } from "@/lib/utils";
import { toZonedTime } from "date-fns-tz";

interface SessionRescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: {
    _id: string;
    date: string;
    therapist: {
      _id: string;
    };
    recurring: Array<{
      index: number;
      date: string;
      status: 'in_progress' | 'completed';
      payment: 'not_paid' | 'paid';
    }>;
  };
  sessionIndex: number; // Index of the session to reschedule
  onSuccess: () => void;
}

interface TimeSlot {
  start: string;
  end: string;
}

const { useBreakpoint } = Grid;

export default function SessionRescheduleDialog({
  open,
  onOpenChange,
  appointment,
  sessionIndex,
  onSuccess
}: SessionRescheduleDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  const [availableDays, setAvailableDays] = useState<Date[]>([]);
  const [availableDayNames, setAvailableDayNames] = useState<string[]>([]);
  const [dayOffset, setDayOffset] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDateCollapsed, setIsDateCollapsed] = useState(false);

  const screens = useBreakpoint();
  const timeSlotRef = useRef<HTMLDivElement | null>(null);

  // Get the main appointment date as the minimum allowed date
  const mainAppointmentDate = parseISO(appointment.date);

  useEffect(() => {
    if (open) {
      resetState();
      initModalData();
    }
  }, [open]);

  const resetState = () => {
    setSelectedDate(null);
    setSelectedTime("");
    setAvailableSlots([]);
    setAvailableDays([]);
    setAvailableDayNames([]);
    setDayOffset(0);
    setIsLoading(false);
    setIsFetchingSlots(false);
    setIsDateCollapsed(false);
  };

  const initModalData = async () => {
    try {
      await fetchTherapistAvailability();
      generateAvailableDays();
      setIsInitialized(true);
    } catch (error) {
      console.error("Initialization error:", error);
      toast.error("Failed to initialize session data");
    }
  };

  useEffect(() => {
    if (isInitialized) {
      generateAvailableDays();
    }
  }, [dayOffset, availableDayNames, isInitialized]);

  useEffect(() => {
    if (selectedDate && isInitialized) {
      fetchAvailableSlots();
      setIsDateCollapsed(true); // Auto-collapse when date is selected
    }
  }, [selectedDate, isInitialized]);

  const formatTimeSlot = (timeString: string) => {
    try {
      // Get patient's timezone
      const patientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Create Date object from the time string
      const date = new Date(timeString);
      
      // Format local time (patient's timezone)
      const localTime = format(toZonedTime(date, patientTimeZone), 'h:mm a');
      
      // Format UAE time
      const uaeTime = format(toZonedTime(date, 'Asia/Dubai'), 'h:mm a');
      
      return (
        <div className="flex flex-col">
          <span className="font-medium">
            {localTime} ({patientTimeZone.split('/')[1] || patientTimeZone})
          </span>
          <div className="text-xs text-gray-500">
            {uaeTime} (UAE)
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error formatting time:', error);
      return format(new Date(timeString), 'h:mm a');
    }
  };

  const fetchTherapistAvailability = async () => {
    try {
      const response = await fetch(`/api/therapistprofiles/${appointment.therapist._id}`);
      if (!response.ok) throw new Error("Failed to fetch availability");
      const data = await response.json();
      // Extract available days from the therapy profile
      const availableDays = data.data?.availability?.map((avail: any) => avail.day) || [];
      setAvailableDayNames(availableDays);
    } catch (error) {
      console.error("Error fetching therapist availability:", error);
      throw error;
    }
  };

  const generateAvailableDays = () => {
    const days: Date[] = [];
    // Start from the main appointment date, not today
    let currentDate = addDays(mainAppointmentDate, dayOffset);
    let daysAdded = 0;

    while (daysAdded < 15) {
      currentDate = addDays(currentDate, 1);
      const dayName = format(currentDate, 'EEEE');
      if (availableDayNames.length === 0 || availableDayNames.includes(dayName)) {
        days.push(new Date(currentDate));
        daysAdded++;
      }
    }

    setAvailableDays(days);
  };

  const fetchAvailableSlots = async () => {
    if (!selectedDate || !appointment.therapist?._id) return;

    setIsFetchingSlots(true);
    setAvailableSlots([]);
    try {
      const response = await fetch("/api/patient/calendar/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          therapistId: appointment.therapist._id,
          date: selectedDate.toISOString(),
          patientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          today: new Date(),
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch available slots");

      const data = await response.json();
      setAvailableSlots(data.availableSlots || []);
    } catch (error) {
      console.error("Error fetching slots:", error);
      toast.error("Failed to load available time slots");
    } finally {
      setIsFetchingSlots(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select both date and time");
      return;
    }

    setIsLoading(true);
    try {
      const [hours, minutes] = selectedTime.split(":");
      const newDate = new Date(selectedDate);
      newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Convert to UTC ISO string without modifying the time
      const utcDate = new Date(newDate.toISOString());

      const response = await fetch("/api/patient/appointments/reschedule-session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment._id,
          sessionIndex: sessionIndex,
          newDate: utcDate.toISOString(),
          localTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reschedule session");
      }

      const data = await response.json();
      toast.success("Session rescheduled successfully");
      
      // Close the popup immediately
      onOpenChange(false);
      
      // Call the success callback to refresh data
      onSuccess();
    } catch (error: any) {
      console.error("Error rescheduling session:", error);
      toast.error(error.message || "Failed to reschedule session");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextDays = () => {
    setDayOffset(prev => prev + 15);
    setSelectedDate(null);
    setSelectedTime("");
    setIsDateCollapsed(false);
  };

  const handlePrevDays = () => {
    const newOffset = Math.max(0, dayOffset - 15);
    setDayOffset(newOffset);
    setSelectedDate(null);
    setSelectedTime("");
    setIsDateCollapsed(false);
  };

  const handleModalClose = () => {
    onOpenChange(false);
  };

  const toggleDateCollapse = () => {
    setIsDateCollapsed(prev => !prev);
  };

  const dateCardSpan = screens.xs ? 8 : 6;
  const timeSlotSpan = screens.xs ? 8 : 6;

  return (
    <Modal
      title={`Reschedule Session ${sessionIndex + 1}`}
      open={open}
      onCancel={handleModalClose}
      footer={[
        <Button key="cancel" onClick={handleModalClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleReschedule}
          loading={isLoading}
          disabled={!selectedDate || !selectedTime}
        >
          Reschedule Session
        </Button>,
      ]}
      bodyStyle={{ padding: 0 }}
      className="session-reschedule-modal sm:max-w-[70vw] w-full"
      destroyOnClose
    >
      <div className="w-full p-4 md:p-6">
        {!isInitialized ? (
          <div className="flex justify-center items-center h-64">
            <Spin size="large" />
          </div>
        ) : (
          <>
            {/* Days Selection */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <Typography.Title level={5} className="!mb-0">
                  Select Date (Available from {format(mainAppointmentDate, "MMM d, yyyy")})
                </Typography.Title>
                <div className="flex gap-2">
                  <Button 
                    onClick={handlePrevDays} 
                    disabled={dayOffset === 0}
                    className="!border !rounded-full !p-2 hover:!border-blue-500 hover:!text-blue-500"
                    icon={<ChevronLeft size={16} />}
                  />
                  <Button 
                    onClick={handleNextDays}
                    className="!border !rounded-full !p-2 hover:!border-blue-500 hover:!text-blue-500"
                    icon={<ChevronRight size={16} />}
                  />
                </div>
              </div>
              
              {!isDateCollapsed && (
                <Row gutter={[8, 8]}>
                  {availableDays.map((date) => {
                    const dayName = format(date, 'EEEE');
                    const isAvailable = availableDayNames.length === 0 || availableDayNames.includes(dayName);
                    const isAfterMainDate = isAfter(date, mainAppointmentDate);

                    return (
                      <Col span={dateCardSpan} key={date.toString()}>
                        <Card
                          hoverable={isAvailable && isAfterMainDate}
                          onClick={() => {
                            if (isAvailable && isAfterMainDate) {
                              setSelectedDate(date);
                              setTimeout(() => {
                                timeSlotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                              }, 100);
                            }
                          }}
                          className={`text-center transition-all duration-200 !rounded-lg ${
                            selectedDate && isSameDay(selectedDate, date)
                              ? "!border-blue-500 !bg-blue-50"
                              : "!border-gray-200"
                          } ${!isAvailable || !isAfterMainDate ? "!opacity-50 !cursor-not-allowed" : ""}`}
                          bodyStyle={{ padding: screens.xs ? '8px 4px' : '12px 8px' }}
                        >
                          <Typography.Text 
                            strong 
                            className={`block ${screens.xs ? 'text-xs' : 'text-sm'}`}
                          >
                            {format(date, "EEE")}
                          </Typography.Text>
                          <Typography.Title 
                            level={screens.xs ? 5 : 4} 
                            className="!m-0 !text-gray-800"
                          >
                            {format(date, "d")}
                          </Typography.Title>
                          <Typography.Text 
                            type="secondary" 
                            className={`block ${screens.xs ? 'text-xs' : 'text-sm'}`}
                          >
                            {format(date, "MMM")}
                          </Typography.Text>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              )}

              {/* Collapse Button - Centered at bottom */}
              <div className="flex justify-center mt-4">
                <Button 
                  onClick={toggleDateCollapse}
                  className="!border !rounded-full !p-2 hover:!border-blue-500 hover:!text-blue-500"
                  icon={isDateCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                />
              </div>
            </div>

            {/* Time Slots */}
            {selectedDate && (
              <div ref={timeSlotRef} className="mt-8">
                <Typography.Title level={5} className="!mb-4">
                  Available Times for {format(selectedDate, "MMMM d, yyyy")}
                  <div className="text-sm text-gray-500 mt-1">
                    {convertToUAETime(selectedDate, { format: 'date' }) as string}
                  </div>
                </Typography.Title>
                {isFetchingSlots ? (
                  <div className="flex justify-center py-4">
                    <Spin />
                  </div>
                ) : availableSlots.length > 0 ? (
                  <Row gutter={[8, 8]}>
                    {availableSlots.map((slot) => {
                      const time = format(new Date(slot.start), "HH:mm");
                      
                      return (
                        <Col span={timeSlotSpan} key={time}>
                          <Card
                            hoverable
                            onClick={() => setSelectedTime(time)}
                            className={`text-center transition-all duration-200 !rounded-lg ${
                              selectedTime === time
                                ? "!border-blue-500 !bg-blue-100"
                                : "!bg-gray-50 !border-gray-200"
                            }`}
                            bodyStyle={{ padding: screens.xs ? '8px 4px' : '12px 8px' }}
                          >
                            {formatTimeSlot(slot.start)}
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                ) : (
                  <div className="text-center py-4">
                    <Typography.Text type="secondary">
                      No available slots for this date
                    </Typography.Text>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
