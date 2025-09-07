"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { addDays, isSameDay } from "date-fns";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { format, formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { useRouter } from "next/navigation";
import { DateSelection } from "./DateSelection";
import { TimeSlotSelection } from "./TimeSlotSelection";
import { RecurringSelection } from "./RecurringSelection";
import { ConfirmationButton } from "./ConfirmationButton";
import { TZDateMini } from '@date-fns/tz';


interface DateTimeSelectionProps {
  onSelect: (dateTime: string, recurringDates: string[]) => void;
  therapistId: string | null;
  planType: string;
  plan?: any;
  isPayWithBalance?: boolean;
}

interface TimeSlot {
  start: string;   // ISO string in therapist's timezone
  end: string;     // ISO string in therapist's timezone
  time: string;
  therapistTime?: string; // Original time from therapist's availability
  patientTime?: string;
}

export default function DateTimeSelection({ 
  onSelect, 
  therapistId, 
  planType,
  plan,
  isPayWithBalance 
}: DateTimeSelectionProps){
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [availableDayNames, setAvailableDayNames] = useState<string[]>([]);
  const [showFullPageLoading, setShowFullPageLoading] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);
  const [selectedRecurringDays, setSelectedRecurringDays] = useState<string[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<{ [key: string]: string }>({});
  const timeSlotsRef = useRef<HTMLDivElement>(null);
  const recurringDaysRef = useRef<HTMLDivElement>(null);
  const daysRef = useRef<HTMLDivElement>(null);
  const [isFetchingDays, setIsFetchingDays] = useState<boolean>(false);
  const [therapistTimeZone, setTherapistTimeZone] = useState<string>('Asia/Dubai');
  const [balance, setBalance] = useState<number>(0);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [availableSessions, setAvailableSessions] = useState<number>(0);
  const [isAgree, setIsAgree] = useState(false);
  const [isFiveMinuteBooking, setIsFiveMinuteBooking] = useState(false);
  const [fiveMinuteSlot, setFiveMinuteSlot] = useState<string | null>(null);
  const [showSameDayUpsell, setShowSameDayUpsell] = useState(false);
  const [isSameDayUpsellMode, setIsSameDayUpsellMode] = useState(false);
  const [patientTimeZone, setPatientTimeZone] = useState<string>('');

  const getTherapistData = async() => {
    if (!therapistId) return;
    const therapistResponse = await fetch(`/api/patient/therapy/${therapistId}`);
    if (!therapistResponse.ok) throw new Error("Failed to fetch therapist data");
    const therapistData = await therapistResponse.json();
    setTherapistTimeZone(therapistData.data.timeZone);
    setPatientTimeZone(session?.user?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  }

  // Set patient timezone on component mount
  useEffect(() => {
    setPatientTimeZone(session?.user?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  // Check plan types
  const isSameDayBookingAllowed = plan && (
    plan.isSameDay === true || 
    (plan.title && plan.title.toLowerCase().includes('same day session'))
  );

  const isFiveMinutePlan = plan && (
    plan.isFiveMin === true ||
    (plan.title && plan.title.toLowerCase().includes('5 minutes'))
  );

  // Fetch user balance
  const getBalance = async() => {
    if(!isAuthenticated) return;
    const response = await fetch('/api/patient/sessions');
    if(response.ok){
      const data = await response.json();
      setBalance(data.balance.totalSessions);
      setAvailableSessions(data.balance.totalSessions);
      setHistory(data.balance.history);
    }
  }

  // Check available balance
  useEffect(() => {
    const getTherapyDataSync = async() => await getTherapistData();
    getTherapyDataSync();
  }, []);

  // Calculate total sessions based on planType
  const totalSessions = (() => {
    switch (planType) {
      case "x2_sessions": return 2;
      case "x3_sessions": return 3;
      case "x4_sessions": return 4;
      case "x5_sessions": return 5;
      case "x6_sessions": return 6;
      case "x7_sessions": return 7;
      case "x8_sessions": return 8;
      case "x9_sessions": return 9;
      case "x10_sessions": return 10;
      case "x11_sessions": return 11;
      case "x12_sessions": return 12;
      default: return 1;
    }
  })();

  useEffect(() => {
    getBalance();
  }, []);

  useEffect(() => {
    if (isFiveMinutePlan) {
      const now = new Date();
      const fiveMinutesLater = new Date(now.getTime() + 5 * 60000);
      setSelectedDate(fiveMinutesLater);
      const hours = fiveMinutesLater.getHours().toString().padStart(2, '0');
      const minutes = fiveMinutesLater.getMinutes().toString().padStart(2, '0');
      setFiveMinuteSlot(`${hours}:${minutes}`);
      setSelectedSlot(`${hours}:${minutes}`);
    }
  }, [isFiveMinutePlan]);

  // Fetch therapist availability
  useEffect(() => {
    if (!therapistId || !isAuthenticated) return;
  
    const fetchAvailability = async () => {
      setIsFetchingDays(true);
      try {
        const response = await fetch(`/api/therapistprofiles/${therapistId}`, {
          cache: "no-store",
          next: { revalidate: 0 }
        });
        if (!response.ok) throw new Error("Failed to fetch availability");
        const data = await response.json();
        // Extract available days from the therapy profile
        const availableDays = data.data?.availability?.map((avail: any) => avail.day) || [];
        setAvailableDayNames(availableDays);
      } catch (error: any) {
        toast.error("Failed to load available time slots", error?.message);
      } finally {
        setIsFetchingDays(false);
      }
    };
  
    fetchAvailability();
  }, [therapistId, isAuthenticated]);

  // Generate available days
  useEffect(() => {
    if (isSameDayBookingAllowed || isFiveMinutePlan) {
      setAvailableDates([new Date()]);
      setDayOffset(0);
      if (!isFiveMinutePlan) {
        setSelectedDate(new Date());
      }
    } else {
      const dates: Date[] = [];
      let currentDate = addDays(new Date(), dayOffset);

      while (dates.length < 15) {
        dates.push(currentDate);
        currentDate = addDays(currentDate, 1);
      }

      setAvailableDates(dates);
    }
  }, [dayOffset, isSameDayBookingAllowed, isFiveMinutePlan]);

  // Set up 5-minute slot when date changes
  useEffect(() => {
    if ((isSameDayBookingAllowed || isFiveMinutePlan) && selectedDate && isSameDay(selectedDate, new Date())) {
      const now = new Date();
      const fiveMinutesLater = new Date(now.getTime() + 5 * 60000);
      const hours = fiveMinutesLater.getHours().toString().padStart(2, '0');
      const minutes = fiveMinutesLater.getMinutes().toString().padStart(2, '0');
      setFiveMinuteSlot(`${hours}:${minutes}`);
      if (isFiveMinutePlan) {
        setSelectedSlot(`${hours}:${minutes}`);
      }
    }
  }, [selectedDate, isSameDayBookingAllowed, isFiveMinutePlan]);

  // Fetch available slots when date is selected
  useEffect(() => {
    if (!selectedDate) return;

    if (isAuthenticated && therapistId) {
      fetchAvailableSlotsFromCalendar();
    } else {
      generateDefaultTimeSlots();
    }
  }, [selectedDate, isAuthenticated, therapistId]);

  // Convert therapist timezone slots to patient timezone
  // In the parent component (DateTimeSelection)
// timezone-convert.ts

const convertSlotsToPatientTimezone = (
  slots: TimeSlot[],
  therapistTz: string,
  patientTz: string,
): TimeSlot[] => {
  return slots.map((slot) => {
    try {
      const [hours, minutes] = slot.time.split(":").map(Number);
      const selected = new Date(selectedDate || '');
      const dateOnly = selected.toISOString().split("T")[0];

      // Construct a therapist-local time using TZDateMini
      const therapistDate = new TZDateMini(dateOnly, therapistTz);
      therapistDate.setHours(hours);
      therapistDate.setMinutes(minutes);

      // Convert to patient time zone
      const patientDate = therapistDate.withTimeZone(patientTz);
      const patientTime = `${String(patientDate.getHours()).padStart(2, '0')}:${String(patientDate.getMinutes()).padStart(2, '0')}`;

      return {
        ...slot,
        therapistTime: slot.time,
        patientTime,
      };
    } catch (error) {
      console.error("Timezone conversion error:", error);
      return {
        ...slot,
        therapistTime: slot.time || '00:00',
        patientTime: slot.time || '00:00',
      };
    }
  });
};



  // Fetch available slots from therapist's calendar
  // In fetchAvailableSlotsFromCalendar function
const fetchAvailableSlotsFromCalendar = async () => {
  if (!selectedDate || !therapistId) return;

  setIsFetchingSlots(true);
  try {
    const response = await fetch("/api/patient/calendar/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        therapistId,
        date: selectedDate.toISOString(),
        patientTimeZone: patientTimeZone,
        isSameDayBookingAllowed,
        isFiveMinutePlan,
        today: new Date(),
      }),
    });

    const data = await response.json();
    
    if (data.availableSlots && data.availableSlots.length > 0) {
      const convertedSlots = convertSlotsToPatientTimezone(
        data.availableSlots,
        therapistTimeZone || data.timeZoneInfo?.therapistTimeZone,
        patientTimeZone
      );
      setAvailableSlots(convertedSlots);
    } else {
      setAvailableSlots([]);
    }
    
  } catch (error) {
    toast.error("Failed to load available time slots");
    setAvailableSlots([]);
  } finally {
    setIsFetchingSlots(false);
  }
};

  // Generate default time slots
 // Generate default time slots
const generateDefaultTimeSlots = () => {
  if (isFiveMinutePlan) {
    setAvailableSlots([]);
    return;
  }

  const slots: TimeSlot[] = [];
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // For unauthenticated users, show all 24 hours
  if (!isAuthenticated) {
    for (let hour = 0; hour < 24; hour++) {
      const slotStart = new Date(selectedDate || now);
      slotStart.setHours(hour, 0, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(hour + 1, 0, 0, 0);

      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        time: `${hour.toString().padStart(2, "0")}:00`,
        therapistTime: `${hour.toString().padStart(2, "0")}:00` || '00:00',
        patientTime: `${hour.toString().padStart(2, "0")}:00` || '00:00',
      });
    }
  } 
  // For authenticated users without therapist data
  else {
    let startHour;
    
    if (selectedDate && isSameDay(selectedDate, now)) {
      if (isSameDayBookingAllowed) {
        startHour = currentHour + 1;
        if (currentMinute > 55) startHour += 1;
      } else {
        startHour = Math.max(currentHour + 8, 8);
      }
    } else {
      startHour = 8;
    }
    
    if (startHour < 20) {
      for (let hour = startHour; hour < 20; hour++) {
        const slotStart = new Date(selectedDate || now);
        slotStart.setHours(hour, 0, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setHours(hour + 1, 0, 0, 0);

        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          time: `${hour.toString().padStart(2, "0")}:00`,
          therapistTime: `${hour.toString().padStart(2, "0")}:00` || '00:00',
          patientTime: `${hour.toString().padStart(2, "0")}:00` || '00:00',
        });
      }
    }
  }

  console.log('slots',slots)
  setAvailableSlots(slots);
};

  const handleFiveMinuteBooking = () => {
    setIsFiveMinuteBooking(true);
    if (fiveMinuteSlot) {
      handleTimeSelect(fiveMinuteSlot);
    }
  };

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setSelectedRecurringDays([]);
    setSelectedTimes({});
  
    if (!isAuthenticated && isSameDay(date, new Date()) && !isSameDayBookingAllowed) {
      setShowSameDayUpsell(true);
    } else {
      setShowSameDayUpsell(false);
    }
  
    setTimeout(() => {
      if (timeSlotsRef.current) {
        timeSlotsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const handleSameDayUpsell = () => {
    const today = new Date();
    setSelectedDate(today);
    setSelectedTime(null);
    setSelectedSlot('');

    setTimeout(() => {
      if (timeSlotsRef.current) {
        timeSlotsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  // Handle time selection
  const handleTimeSelect = (time?: string) => {
    if(!time) return;
    setSelectedSlot(time);
    setSelectedTime(time);
  };

  // Handle recurring day selection
  const handleRecurringDaySelect = (day: string) => {
    if (selectedRecurringDays.includes(day)) {
      setSelectedRecurringDays(selectedRecurringDays.filter((d) => d !== day));
      setSelectedTimes((prev) => {
        const newTimes = { ...prev };
        delete newTimes[day];
        return newTimes;
      });
    } else if (selectedRecurringDays.length < (totalSessions <= 4 ? 1 : 2)) {
      setSelectedRecurringDays([...selectedRecurringDays, day]);
    }
  };

  // Handle time selection for a specific day
  const handleDayTimeSelect = (day: string, time: string) => {
    setSelectedTimes(prev => ({
      ...prev,
      [day]: time
    }));
    if (!selectedTime) {
      const localTimeStart = convertTimeToTimeZone(time, patientTimeZone);
      setSelectedTime(localTimeStart || time);
    }
  };

  // Generate recurring dates
  const generateRecurringDates = () => {
    if (totalSessions === 1) return [];
    if (selectedRecurringDays.length === 0) return [];
  
    const now = new Date();
    const recurringDates: Date[] = [];
  
    let dateCursor = new Date();
    dateCursor.setDate(dateCursor.getDate() + 1);
    dateCursor.setHours(0, 0, 0, 0);
  
    outerLoop:
    for (let week = 0; week < 6; week++) {
      for (const day of selectedRecurringDays) {
        if (recurringDates.length >= totalSessions) break outerLoop;
        
        const dayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
          .indexOf(day);
        
        const daysToAdd = (dayIndex - dateCursor.getDay() + 7) % 7;
        const nextDate = new Date(dateCursor);
        nextDate.setDate(dateCursor.getDate() + daysToAdd);
        
        const selectedTime = selectedTimes[day];
        if (selectedTime) {
          const [hours, minutes] = selectedTime.split(':').map(Number);
          nextDate.setHours(hours, minutes, 0, 0);
        }
        
        if (nextDate > now) {
          recurringDates.push(nextDate);
        }
        
        dateCursor.setDate(dateCursor.getDate() + 7);
      }
    }
  
    recurringDates.sort((a, b) => a.getTime() - b.getTime());
    return recurringDates.slice(0, totalSessions);
  };

  // Handle payment with balance
  const handlePayWithBalance = async () => {
    if (totalSessions === 1) {
      if (!selectedDate || !selectedSlot) {
        toast.error("Please select both date and time");
        return;
      }
      
      if (balance < 1) {
        toast.error("Insufficient balance for this session");
        return;
      }
    } else {
      if (selectedRecurringDays.length === 0 || !selectedRecurringDays.every(day => selectedTimes[day])) {
        toast.error("Please select recurring days and times");
        return;
      }
    }
  
    setShowFullPageLoading(true);
  
    try {
      let payload;
  
      if (totalSessions === 1 && selectedDate) {
        const [hours, minutes] = selectedSlot.split(':')
        const formatedHour = Number(hours) || Number(hours.split('T')[1])
        const appointmentDateTime = new Date(selectedDate);
        appointmentDateTime.setHours(formatedHour, Number(minutes), 0, 0);
  
        payload = {
          date: appointmentDateTime.toISOString(),
          recurring: [],
          plan: plan._id,
          price: plan.price,
          therapyType: plan.therapyType,
          localTimeZone: patientTimeZone,
          hasPreferedDate: false,
          useBalance: true
        };
      } else {
        const recurringDates = generateRecurringDates();
      
        if (recurringDates.length < totalSessions) {
          throw new Error("Could not find enough future dates for all sessions");
        }
  
        payload = {
          date: recurringDates[0].toISOString(),
          recurring: recurringDates.slice(1).map(date => date.toISOString()),
          plan: plan._id,
          price: plan.price,
          therapyType: plan.therapyType,
          localTimeZone: patientTimeZone,
          hasPreferedDate: false,
          recurringSchedule: selectedRecurringDays.map(day => ({
            day,
            time: selectedTimes[day]
          })),
          useBalance: true
        };
      }
  
      const response = await fetch('/api/patient/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create appointment');
      }
  
      const data = await response.json();
      toast.success(data.message || "Appointment created successfully using your balance!");
      router.push('/dashboard');
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to create appointment');
    } finally {
      setShowFullPageLoading(false);
    }
  };

  // Handle confirm button click
  const handleConfirm = () => {
    if (totalSessions === 1) {
      let dateTime: Date;
      
      if (isFiveMinutePlan && fiveMinuteSlot) {
        dateTime = new Date(new Date().getTime() + 5 * 60000);
      } else if (selectedDate && selectedSlot) {
        const [hours, minutes] = selectedSlot.split(':');
        dateTime = new Date(selectedDate);
        dateTime.setHours(Number(hours), Number(minutes), 0, 0);
  
        // Convert to UTC using patient's timezone
        const utcDate = fromZonedTime(dateTime, patientTimeZone);
        
        onSelect(utcDate.toISOString(), []);
        console.log('selected time', utcDate.toISOString())
        return;
      } else {
        toast.error("Please select both date and time");
        return;
      }
  
      onSelect(dateTime.toISOString(), []);
    } else {
      if (selectedRecurringDays.length === 0 || Object.keys(selectedTimes).length === 0) {
        toast.error("Please select recurring days and times");
        return;
      }
  
      const recurringDates = generateRecurringDates();
      
      if (recurringDates.length === 0) {
        toast.error("Failed to generate recurring dates");
        return;
      }
  
      // Convert each recurring date to UTC using patient's timezone
      const processedDates = recurringDates.map(date => {
        const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
        const time = selectedTimes[dayName];
        if (time) {
          const [hours, minutes] = time.split(':').map(Number);
          date.setHours(hours, minutes, 0, 0);
        }
        
        return fromZonedTime(date, patientTimeZone).toISOString();
      });
  
      const appointmentDate = processedDates[0];
      const recurringDatesArray = processedDates.slice(1);
  
      onSelect(appointmentDate, recurringDatesArray);
    }
  
    setIsLoading(true);
    setShowFullPageLoading(true);
  };
  

  // Navigation handlers
  const handleNext = () => setDayOffset((prev) => prev + 15);
  const handleBack = () => setDayOffset((prev) => Math.max(0, prev - 15));

  // Time conversion helper
  const convertTimeToTimeZone = (timeString: string, timeZone: string) => {
    if (!selectedDate) return timeString;
    
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      const dateWithTime = new Date(selectedDate);
      dateWithTime.setHours(hours, minutes, 0, 0);
      
      return format(toZonedTime(dateWithTime, timeZone), "HH:mm");
    } catch (error) {
      console.error("Time conversion error:", error);
      return timeString;
    }
  };

  if (showFullPageLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
          <p className="text-lg font-medium">Processing your appointment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4"> {/* Reduced from space-y-6 */}
      {/* Same-day booking indicator */}
      {isSameDayBookingAllowed && (
        <div className="bg-green-50 border border-green-200 rounded-md p-2 mb-2 text-sm">
          <p className="text-green-700">
            This plan allows same-day booking.
          </p>
        </div>
      )}

      {/* 5-minute plan indicator */}
      {isFiveMinutePlan && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-2 mb-2 text-sm">
          <p className="text-blue-700">Immediate Session</p>
          <p className="text-blue-600 text-xs">
            Starts in approximately 5 minutes
          </p>
        </div>
      )}

      {/* Same-day upsell */}
      {showSameDayUpsell && (
        <div className="bg-green-50 border border-green-200 rounded-md p-2 mb-2 flex items-center justify-between text-sm">
          <div>
            <p className="text-green-700">Need to book today?</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleSameDayUpsell}>
            Show Slots
          </Button>
        </div>
      )}

      {/* Date Selection */}
      {totalSessions === 1 && !isFiveMinuteBooking && !isFiveMinutePlan && (
        <div className="mb-3">
          <DateSelection
            availableDates={availableDates}
            dayOffset={dayOffset}
            handleDateSelect={handleDateSelect}
            handleBack={handleBack}
            handleNext={handleNext}
            selectedDate={selectedDate}
            isFetchingDays={isFetchingDays}
            isAuthenticated={isAuthenticated}
            availableDayNames={availableDayNames}
            isSameDayBookingAllowed={isSameDayBookingAllowed}
          />
        </div>
      )}

      {/* Time Slot Selection */}
      {selectedDate && totalSessions === 1 && (
        <div className="mb-3">
          <TimeSlotSelection
            isFetchingSlots={isFetchingSlots}
            availableSlots={isFiveMinutePlan || isFiveMinuteBooking ? [] : availableSlots}
            selectedSlot={selectedSlot}
            handleTimeSelect={handleTimeSelect}
            isAuthenticated={isAuthenticated}
            therapistId={therapistId}
            therapistTimeZone={therapistTimeZone}
            isFiveMinuteBooking={isFiveMinuteBooking || isFiveMinutePlan}
            fiveMinuteSlot={fiveMinuteSlot}
            selectedDate={selectedDate}
          />
        </div>
      )}

      {/* 5-minute upsell */}
      {isSameDayBookingAllowed && !isFiveMinutePlan && !isFiveMinuteBooking && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-2 mb-3 text-sm">
          <div className="flex justify-between items-center">
            <p className="text-blue-700">5-minute booking available</p>
            <Button variant="outline" size="sm" onClick={handleFiveMinuteBooking}>
              Book Now
            </Button>
          </div>
        </div>
      )}

      {/* Recurring Selection */}
      {totalSessions > 1 && (
        <div className="mb-3">
          <RecurringSelection
            totalSessions={totalSessions}
            selectedRecurringDays={selectedRecurringDays}
            handleRecurringDaySelect={handleRecurringDaySelect}
            selectedTimes={selectedTimes}
            handleDayTimeSelect={handleDayTimeSelect}
          />
        </div>
      )}

      {/* Confirmation Button */}
      {(
        (totalSessions === 1 && (selectedTime || selectedSlot)) || 
        (totalSessions > 1 && selectedRecurringDays.length > 0 && 
        Object.keys(selectedTimes).length === selectedRecurringDays.length)
      ) && (
        <div className="mt-4">
          <ConfirmationButton
            isPayWithBalance={isPayWithBalance || false}
            isLoading={isLoading}
            availableSessions={availableSessions}
            handlePayWithBalance={handlePayWithBalance}
            handleConfirm={handleConfirm}
            isAgree={isAgree}
            setIsAgree={setIsAgree}
          />
        </div>
      )}
    </div>
  );
}