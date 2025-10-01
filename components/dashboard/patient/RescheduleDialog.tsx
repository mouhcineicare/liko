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
import { format, addDays, isSameDay } from "date-fns";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { convertToUAETime } from "@/lib/utils";
import { toZonedTime } from "date-fns-tz";
import { isSameDayBooking, SAME_DAY_PRICING } from "@/lib/constants/plans";
import SameDayBookingModal from "./SameDayBookingModal";

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: {
    _id: string;
    therapist: {
      _id: string;
    };
  };
  onSuccess: () => void;
  sessionToBeReduced: boolean;
  sessionInfo?: {
    index: number;
    name: string;
    date: string;
    packageName: string;
  };
  isInitialScheduling?: boolean; // New prop to distinguish initial scheduling from rescheduling
}

interface TimeSlot {
  start: string;
  end: string;
}

const { useBreakpoint } = Grid;

export default function RescheduleDialog({
  open,
  onOpenChange,
  appointment,
  onSuccess,
  sessionToBeReduced,
  sessionInfo,
  isInitialScheduling = false
}: RescheduleDialogProps) {
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
  const [showSameDayModal, setShowSameDayModal] = useState(false);
  const [sessionBalance, setSessionBalance] = useState(0);

  const screens = useBreakpoint();
  const timeSlotRef = useRef<HTMLDivElement | null>(null);

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
    setShowSameDayModal(false);
  };

  const initModalData = async () => {
    try {
      await Promise.all([
        fetchTherapistAvailability(),
        fetchSessionBalance()
      ]);
      generateAvailableDays();
      setIsInitialized(true);
    } catch (error) {
      console.error("Initialization error:", error);
      toast.error("Failed to initialize appointment data");
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

  const fetchSessionBalance = async () => {
    try {
      const response = await fetch('/api/patient/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessionBalance(data.balance.balanceAmount);
      }
    } catch (error) {
      console.error("Failed to fetch session balance", error);
      // Don't throw error, just set to 0
      setSessionBalance(0);
    }
  };

  const generateAvailableDays = () => {
    const days: Date[] = [];
    let currentDate = addDays(new Date(), dayOffset);
    let daysAdded = 0;

    while (daysAdded < 15) {
      // Include today for same-day booking, otherwise start from tomorrow
      if (daysAdded === 0) {
        // First day - include today
        currentDate = addDays(new Date(), dayOffset);
      } else {
        currentDate = addDays(currentDate, 1);
      }
      
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
          isSameDayBookingAllowed: true, // Enable same-day booking
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

  // Check if this is a same-day booking
  const isSameDaySlot = isSameDayBooking(selectedDate, selectedTime);
  console.log('Same-day booking check in RescheduleDialog:', {
    selectedDate: selectedDate?.toISOString(),
    selectedTime,
    isSameDaySlot,
    today: new Date().toISOString()
  });
  
  if (isSameDaySlot) {
    console.log('Showing same-day modal');
    setShowSameDayModal(true);
    return;
  }

  await performReschedule();
};

const performReschedule = async () => {
  if (!selectedDate || !selectedTime) return;

  setIsLoading(true);
  try {
    const [hours, minutes] = selectedTime.split(":");
    const newDate = new Date(selectedDate);
    newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Convert to UTC ISO string without modifying the time
    const utcDate = new Date(newDate.toISOString());

    let response;
    let successMessage;

    if (isInitialScheduling) {
      // For initial scheduling, update the appointment date and status
      response = await fetch("/api/patient/appointments/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment._id,
          newDate: utcDate.toISOString(),
          localTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }),
      });
      successMessage = "Appointment scheduled successfully";
    } else {
      // For rescheduling, use the existing reschedule endpoint
      response = await fetch("/api/patient/appointments/reschedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment._id,
          newDate: utcDate.toISOString(),
          sessionToBeReduced,
          localTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          sessionIndex: sessionInfo?.index
        }),
      });
      successMessage = "Appointment rescheduled successfully";
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to ${isInitialScheduling ? 'schedule' : 'reschedule'} appointment`);
    }

    const data = await response.json();
    toast.success(successMessage);
    onSuccess();
    onOpenChange(false);
  } catch (error: any) {
    console.error(`Error ${isInitialScheduling ? 'scheduling' : 'rescheduling'} appointment:`, error);
    toast.error(error.message || `Failed to ${isInitialScheduling ? 'schedule' : 'reschedule'} appointment`);
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

  const handleSameDayUseBalance = async () => {
    // For same-day booking, we need to handle the surcharge
    const totalPrice = SAME_DAY_PRICING.BASE_PRICE * SAME_DAY_PRICING.SURCHARGE_MULTIPLIER;
    const surchargeAmount = totalPrice - SAME_DAY_PRICING.BASE_PRICE;
    
    if (sessionBalance < totalPrice) {
      toast.error(`Insufficient balance. You need ${totalPrice} AED but have ${sessionBalance.toFixed(2)} AED`);
      return;
    }

    // Use the same-day booking API with balance payment for reschedule
    setIsLoading(true);
    try {
      const [hours, minutes] = selectedTime.split(":");
      const newDate = new Date(selectedDate);
      newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const response = await fetch('/api/patient/appointments/same-day-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: appointment._id,
          newDate: newDate.toISOString(),
          selectedSlot: {
            date: newDate.toISOString(),
            time: selectedTime,
            therapistId: appointment.therapist?._id || appointment.therapist
          },
          isReschedule: true,
          sessionToBeReduced,
          sessionIndex: sessionInfo?.index,
          useBalance: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reschedule appointment with balance");
      }

      const data = await response.json();
      console.log('Reschedule with balance result:', data);
      
      toast.success("Appointment rescheduled successfully using your balance!");
      onSuccess();
      onOpenChange(false);
      setShowSameDayModal(false);
    } catch (error: any) {
      console.error("Error rescheduling appointment with balance:", error);
      toast.error(error.message || "Failed to reschedule appointment with balance");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSameDayPayNow = async () => {
    // For same-day rescheduling with surcharge, use the same-day booking API directly
    try {
      const [hours, minutes] = selectedTime.split(":");
      const newDate = new Date(selectedDate);
      newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const response = await fetch('/api/patient/appointments/same-day-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: appointment._id,
          newDate: newDate.toISOString(),
          selectedSlot: {
            date: newDate.toISOString(),
            time: selectedTime,
            therapistId: appointment.therapist?._id || appointment.therapist
          },
          isReschedule: true,
          sessionToBeReduced,
          sessionIndex: sessionInfo?.index,
          useBalance: false // Stripe payment
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reschedule appointment");
      }

      const data = await response.json();
      
      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error("No redirect URL provided in payment response");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to reschedule appointment");
    }
  };

  const handleSameDayPayRemaining = async () => {
    // Pay only the remaining amount needed
    const totalPrice = SAME_DAY_PRICING.BASE_PRICE * SAME_DAY_PRICING.SURCHARGE_MULTIPLIER;
    const remainingAmount = totalPrice - sessionBalance;
    
    try {
      const [hours, minutes] = selectedTime.split(":");
      const newDate = new Date(selectedDate);
      newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const response = await fetch('/api/patient/appointments/same-day-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: appointment._id,
          newDate: newDate.toISOString(),
          selectedSlot: {
            date: newDate.toISOString(),
            time: selectedTime,
            therapistId: appointment.therapist?._id || appointment.therapist
          },
          isReschedule: true,
          sessionToBeReduced,
          sessionIndex: sessionInfo?.index,
          useBalance: false // Stripe payment for remaining amount
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reschedule appointment");
      }

      const data = await response.json();
      
      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error("No redirect URL provided in payment response");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to reschedule appointment");
    }
  };

  const dateCardSpan = screens.xs ? 8 : 6;
  const timeSlotSpan = screens.xs ? 8 : 6;

  return (
    <Modal
      title={isInitialScheduling ? "Schedule Your Appointment" : "Reschedule Appointment"}
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
          Reschedule
        </Button>,
      ]}
      bodyStyle={{ padding: 0 }}
      className="reschedule-modal sm:max-w-[70vw] w-full"
      destroyOnClose
    >
      <div className="w-full p-4 md:p-6">
        {/* Session Info Header */}
        {sessionInfo && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">
                  {sessionInfo.index === 0 ? '1' : sessionInfo.index + 1}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">
                  Rescheduling {sessionInfo.name}
                </h3>
                <p className="text-sm text-blue-700">
                  {sessionInfo.packageName} • {format(new Date(sessionInfo.date), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>
        )}

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
                  Select Date
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

                    return (
                      <Col span={dateCardSpan} key={date.toString()}>
                        <Card
                          hoverable={isAvailable}
                          onClick={() => {
                            if (isAvailable) {
                              setSelectedDate(date);
                              // Check if this is a same-day booking when date is selected
                              if (selectedTime && isSameDayBooking(date, selectedTime)) {
                                console.log('Same-day date clicked, showing modal');
                                setShowSameDayModal(true);
                              }
                              setTimeout(() => {
                                timeSlotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                              }, 100);
                            }
                          }}
                          className={`text-center transition-all duration-200 !rounded-lg ${
                            selectedDate && isSameDay(selectedDate, date)
                              ? "!border-blue-500 !bg-blue-50"
                              : "!border-gray-200"
                          } ${!isAvailable ? "!opacity-50 !cursor-not-allowed" : ""}`}
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
                      const isSameDaySlot = selectedDate && isSameDayBooking(selectedDate, time);
                      console.log('Time slot same-day check:', {
                        time,
                        selectedDate: selectedDate?.toISOString(),
                        isSameDaySlot,
                        today: new Date().toISOString()
                      });
                      
                      return (
                        <Col span={timeSlotSpan} key={time}>
                          <Card
                            hoverable
                            onClick={() => {
                              setSelectedTime(time);
                              // Check if this is a same-day booking when time is selected
                              if (selectedDate && isSameDayBooking(selectedDate, time)) {
                                console.log('Same-day slot clicked, showing modal');
                                setShowSameDayModal(true);
                              }
                            }}
                            className={`text-center transition-all duration-200 !rounded-lg ${
                              selectedTime === time
                                ? isSameDaySlot
                                  ? "!border-orange-500 !bg-orange-100"
                                  : "!border-blue-500 !bg-blue-100"
                                : isSameDaySlot
                                ? "!bg-orange-50 !border-orange-200"
                                : "!bg-gray-50 !border-gray-200"
                            }`}
                            bodyStyle={{ padding: screens.xs ? '8px 4px' : '12px 8px' }}
                          >
                            <div className="flex flex-col items-center">
                              {formatTimeSlot(slot.start)}
                              {isSameDaySlot && (
                                <div className="text-xs text-orange-600 font-medium mt-1">
                                  +64% surcharge
                                </div>
                              )}
                            </div>
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

      {/* Same-Day Booking Modal */}
      {selectedDate && selectedTime && (
        <SameDayBookingModal
          open={showSameDayModal}
          onOpenChange={setShowSameDayModal}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          sessionBalance={sessionBalance}
          onUseBalance={handleSameDayUseBalance}
          onPayNow={handleSameDayPayNow}
          onPayRemaining={handleSameDayPayRemaining}
          isLoading={isLoading}
          isReschedule={true}
        />
      )}
    </Modal>
  );
}