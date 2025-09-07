// app/dashboard/patient/SessionsRebooking/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Calendar, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, eachDayOfInterval, isSameDay } from "date-fns";
import { toast } from "sonner";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { isSameDayBooking, SAME_DAY_PRICING } from "@/lib/constants/plans";
import SameDayBookingModal from "@/components/dashboard/patient/SameDayBookingModal";

interface TimeSlot {
  start: string;
  end: string;
  time: string;
  therapistTime?: string;
  available: boolean;
  localTime?: string;
  uaeTime?: string;
  patientTimeZone?: string;
}

interface DaySchedule {
  date: string;
  day: string;
  slots: TimeSlot[];
}

interface SelectedSession {
  day: string;
  time: string;
  date: string; // ISO date string
  weekOffset: number; // Track which week this session belongs to
}

export default function SessionsRebooking() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [sessionBalance, setSessionBalance] = useState(0);
  const [therapistTimeZone, setTherapistTimeZone] = useState('Asia/Dubai');
  const [patientTimeZone, setPatientTimeZone] = useState('');
  const [therapistId, setTherapistId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [availableDayNames, setAvailableDayNames] = useState<string[]>([]);

  // Rebooking state
  const [selectedRebookingTimes, setSelectedRebookingTimes] = useState<SelectedSession[]>([]);
  const [availability, setAvailability] = useState<DaySchedule[]>([]);
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [originalPrice, setOriginalPrice] = useState(0);
  const [discountMessage, setDiscountMessage] = useState("");
  const [priceDisplayColorClass, setPriceDisplayColorClass] = useState("text-blue-600");
  const [selectedSlotsColorClass, setSelectedSlotsColorClass] = useState("bg-blue-600");
  const [showPurchaseOptions, setShowPurchaseOptions] = useState(false);
  const [isFetchingAvailability, setIsFetchingAvailability] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showDiscountOption, setShowDiscountOption] = useState(false);
  const [isBookingMode, setIsBookingMode] = useState(false);
  const [showSameDayModal, setShowSameDayModal] = useState(false);
  const [selectedSameDaySlot, setSelectedSameDaySlot] = useState<{day: string, time: string, date: string} | null>(null);

  // Pricing constants
  const SINGLE_SESSION_PRICE = 110;
  const FOUR_SESSION_DISCOUNT_PERCENTAGE = 0.1;
  const EIGHT_SESSION_DISCOUNT_PERCENTAGE = 0.2;

  // Calculate the current week's dates - filter by therapist availability like reschedule dialog
  const getCurrentWeekDates = () => {
    const days: Date[] = [];
    let currentDate = addDays(new Date(), weekOffset * 7);
    let daysAdded = 0;

    while (daysAdded < 7) {
      // Include today for same-day booking, otherwise start from tomorrow
      if (daysAdded === 0) {
        // First day - include today
        currentDate = addDays(new Date(), weekOffset * 7);
      } else {
        currentDate = addDays(currentDate, 1);
      }
      
      const dayName = format(currentDate, 'EEEE');
      // Only include days when therapist is available (same logic as reschedule dialog)
      if (availableDayNames.length === 0 || availableDayNames.includes(dayName)) {
        days.push(new Date(currentDate));
        daysAdded++;
      }
    }

    return days;
  };

  // Set patient timezone and fetch initial data
  useEffect(() => {
    if (!session?.user?.id) return;
    
    setPatientTimeZone(session.user.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone);
    fetchSessionBalance();
    fetchCurrentTherapist();
  }, [session]);

  // Fetch availability when therapist, week, or available days change
  useEffect(() => {
    if (therapistId && availableDayNames.length > 0) {
      fetchTherapistAvailability();
    }
  }, [therapistId, weekOffset, availableDayNames]);

  const fetchSessionBalance = async () => {
    try {
      const response = await fetch('/api/patient/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessionBalance(data.balance.totalSessions);
      }
    } catch (error) {
      console.error("Failed to fetch session balance", error);
      toast.error("Failed to load session balance");
    }
  };

  const fetchCurrentTherapist = async () => {
    try {
      const response = await fetch('/api/patient/therapy');
      if (response.ok) {
        const data = await response.json();
        setTherapistId(data.therapyId);
        setTherapistTimeZone(data.therapistTimezone || 'Asia/Dubai');
        // Also fetch therapist availability days
        if (data.therapyId) {
          await fetchTherapistAvailableDays(data.therapyId);
        }
      }
    } catch (error) {
      console.error("Failed to fetch current therapist", error);
      toast.error("Failed to load therapist information");
    }
  };

  const fetchTherapistAvailableDays = async (therapistId: string) => {
    try {
      const response = await fetch(`/api/therapistprofiles/${therapistId}`);
      if (!response.ok) throw new Error("Failed to fetch therapist availability");
      const data = await response.json();
      // Extract available days from the therapy profile
      const availableDays = data.data?.availability?.map((avail: any) => avail.day) || [];
      setAvailableDayNames(availableDays);
    } catch (error) {
      console.error("Error fetching therapist availability:", error);
      // Don't throw error, just set empty array
      setAvailableDayNames([]);
    }
  };

  const fetchTherapistAvailability = async () => {
    if (!therapistId) return;
    
    setIsFetchingAvailability(true);
    try {
      const weekDates = getCurrentWeekDates();
      const availabilityData: DaySchedule[] = [];

      // Fetch availability for each day in the week - using same approach as reschedule
      for (const date of weekDates) {
        const response = await fetch('/api/patient/calendar/slots', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            therapistId,
            date: date.toISOString(),
            today: new Date(),
            patientTimeZone,
            isSameDayBookingAllowed: true // Enable same-day booking
          }),
        });

        if (!response.ok) throw new Error(`Failed to fetch availability for ${date}`);
        
        const data = await response.json();
        // Use the same processing logic as reschedule dialog
        const dayAvailability = processDayAvailabilityReschedule(date, data.availableSlots);
        availabilityData.push(dayAvailability);
      }

      setAvailability(availabilityData);
    } catch (error) {
      console.error("Error fetching availability:", error);
      toast.error("Failed to load available time slots");
    } finally {
      setIsFetchingAvailability(false);
    }
  };

  // New processing function that matches reschedule dialog approach
  const processDayAvailabilityReschedule = (date: Date, slots: any[]): DaySchedule => {
    const dayName = format(date, 'EEEE');
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Process slots exactly like reschedule dialog - use same timezone conversion
    const processedSlots = slots.map(slot => {
      try {
        // Get patient's timezone (same as reschedule dialog)
        const patientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Create Date object from the time string
        const date = new Date(slot.start);
        
        // Format local time (patient's timezone) - same as reschedule dialog
        const localTime = format(toZonedTime(date, patientTimeZone), 'h:mm a');
        
        // Format UAE time - same as reschedule dialog
        const uaeTime = format(toZonedTime(date, 'Asia/Dubai'), 'h:mm a');
        
        // Use the same time format as reschedule dialog
        const time = format(new Date(slot.start), "HH:mm");
        
        return {
          ...slot,
          time: time,
          therapistTime: slot.time,
          available: slot.available !== false,
          // Add the same display format as reschedule dialog
          localTime: localTime,
          uaeTime: uaeTime,
          patientTimeZone: patientTimeZone
        };
      } catch (error) {
        console.error("Timezone conversion error:", error);
        return {
          ...slot,
          available: false
        };
      }
    });

    return {
      date: dateStr,
      day: dayName,
      slots: processedSlots
    };
  };

  // Keep original function for backward compatibility
  const processDayAvailability = (date: Date, slots: any[]): DaySchedule => {
    const dayName = format(date, 'EEEE');
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Convert slots to patient timezone - only show actual available slots
    const processedSlots = slots.map(slot => {
      try {
        const therapistDate = new Date(slot.start);
        const patientDate = fromZonedTime(therapistDate, patientTimeZone);
        const patientTime = format(patientDate, 'HH:mm');
        
        return {
          ...slot,
          time: patientTime,
          therapistTime: slot.time,
          available: slot.available !== false
        };
      } catch (error) {
        console.error("Timezone conversion error:", error);
        return {
          ...slot,
          available: false
        };
      }
    }).filter(slot => slot.available); // Only keep available slots

    return {
      date: dateStr,
      day: dayName,
      slots: processedSlots
    };
  };

const handleRebookingTimeSelect = (day: string, time: string, date: string) => {
  // Check if this is a same-day booking
  const selectedDate = new Date(date);
  if (isSameDayBooking(selectedDate, time)) {
    setSelectedSameDaySlot({ day, time, date });
    setShowSameDayModal(true);
    return;
  }

  const existingIndex = selectedRebookingTimes.findIndex(
    s => s.day === day && s.time === time && s.weekOffset === weekOffset
  );

  setSelectedRebookingTimes(prev => {
    let newTimes;
    if (existingIndex >= 0) {
      // Remove if already selected in current week
      newTimes = prev.filter((_, i) => i !== existingIndex);
    } else {
      // Add new selection with week info
      newTimes = [
        ...prev,
        {
          day,
          time,
          date,
          weekOffset
        }
      ];
    }
    
    // Set selected day for single slot booking
    if (newTimes.length === 1 && existingIndex === -1) {
      setSelectedDay(day);
      setShowDiscountOption(true);
    } else if (newTimes.length === 0) {
      setSelectedDay(null);
      setShowDiscountOption(false);
    }
    
    // Calculate price based on the new state immediately
    calculatePriceAndDiscount(newTimes.length);
    return newTimes;
  });
};

const calculatePriceAndDiscount = (numberOfSessions: number) => {
  let price = 0;
  let original = 0;
  let message = "";
  let colorClass = "text-blue-600";
  let bgClass = "bg-blue-600";

  // Calculate price for each selected session
  selectedRebookingTimes.forEach(session => {
    const sessionDate = new Date(session.date);
    const isSameDay = isSameDayBooking(sessionDate, session.time);
    
    if (isSameDay) {
      // Same-day booking with surcharge
      const basePrice = SAME_DAY_PRICING.BASE_PRICE;
      const surchargePrice = basePrice * SAME_DAY_PRICING.SURCHARGE_MULTIPLIER;
      price += surchargePrice;
      original += surchargePrice;
    } else {
      // Regular booking
      price += SINGLE_SESSION_PRICE;
      original += SINGLE_SESSION_PRICE;
    }
  });

  // Apply bulk discounts
  if (numberOfSessions >= 8) {
    original = price;
    price *= (1 - EIGHT_SESSION_DISCOUNT_PERCENTAGE);
    message = "20% discount applied for 8+ sessions!";
    colorClass = "text-purple-600";
    bgClass = "bg-purple-600";
  } else if (numberOfSessions >= 4) {
    original = price;
    price *= (1 - FOUR_SESSION_DISCOUNT_PERCENTAGE);
    message = "10% discount applied for 4+ sessions!";
    colorClass = "text-orange-600";
    bgClass = "bg-orange-600";
  }

  setCalculatedPrice(price);
  setOriginalPrice(original);
  setDiscountMessage(message);
  setPriceDisplayColorClass(colorClass);
  setSelectedSlotsColorClass(bgClass);
};

const handlePurchaseSessions = async (sessions: number) => {
  try {
    setIsLoading(true);
    
    const price = sessions >= 8 
      ? sessions * SINGLE_SESSION_PRICE * (1 - EIGHT_SESSION_DISCOUNT_PERCENTAGE)
      : sessions >= 4 
      ? sessions * SINGLE_SESSION_PRICE * (1 - FOUR_SESSION_DISCOUNT_PERCENTAGE)
      : sessions * SINGLE_SESSION_PRICE;

    const response = await fetch('/api/patient/balance/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessions,
        price
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to initiate payment");
    }

    const { url } = await response.json();
    // Redirect to Stripe checkout
    window.location.href = url;

  } catch (error: any) {
    toast.error(error.message || "Failed to initiate payment");
    setIsLoading(false);
  }
};

  const handleConfirmBooking = async () => {
  if (selectedRebookingTimes.length === 0) {
    toast.error("Please select at least one time slot");
    return;
  }

  if (sessionBalance < calculatedPrice) {
    toast.error("Insufficient session balance");
    return;
  }

  setIsLoading(true);
  
  try {
    // Sort sessions by date
    const sortedSessions = [...selectedRebookingTimes].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // First appointment is the main one, others are recurring
    const [firstSession, ...recurringSessions] = sortedSessions;

    // Create the appointment
    const response = await fetch('/api/patient/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: firstSession.date,
        localTimeZone: patientTimeZone,
        therapyType: 'individual', // Add required field
        price: calculatedPrice,
        plan: 'Single Online Therapy Session',
        recurring: recurringSessions.map(session => ({ 
          date: session.date, 
          status: "in_progress", 
          payment: "unpaid" 
        })),
        discount: originalPrice - calculatedPrice,
        discountPercentage: selectedRebookingTimes.length >= 8 ? 20 : 
                         selectedRebookingTimes.length >= 4 ? 10 : 0,
        isRebooking: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Appointment creation failed:", errorData);
      throw new Error(errorData.error || "Failed to create appointment");
    }
    
    const result = await response.json();
    console.log("Appointment created successfully:", result);
    
    toast.success("Sessions booked successfully!");
    router.push(`/dashboard/patient`);
    router.refresh();
  } catch (error: any) {
    console.error("Booking error:", error);
    toast.error(error.message || "Failed to book sessions");
  } finally {
    setIsLoading(false);
  }
};

const handleNextWeek = () => {
  setWeekOffset(prev => prev + 1);
};

const handlePrevWeek = () => {
  if (weekOffset > 0) {
    setWeekOffset(prev => prev - 1);
  }
};

const handleSameDayUseBalance = async () => {
  if (!selectedSameDaySlot) return;
  
  // Add to selected times
  setSelectedRebookingTimes(prev => [
    ...prev,
    {
      day: selectedSameDaySlot.day,
      time: selectedSameDaySlot.time,
      date: selectedSameDaySlot.date,
      weekOffset
    }
  ]);
  
  // Recalculate price
  calculatePriceAndDiscount(selectedRebookingTimes.length + 1);
  
  setShowSameDayModal(false);
  setSelectedSameDaySlot(null);
  toast.success("Same-day session added to your selection");
};

const handleSameDayPayNow = async () => {
  if (!selectedSameDaySlot) return;
  
  // Add to selected times and close modal
  setSelectedRebookingTimes(prev => [
    ...prev,
    {
      day: selectedSameDaySlot.day,
      time: selectedSameDaySlot.time,
      date: selectedSameDaySlot.date,
      weekOffset
    }
  ]);
  
  setShowSameDayModal(false);
  setSelectedSameDaySlot(null);
  toast.success("Same-day session added to your selection");
};

const handleSameDayPayRemaining = async () => {
  if (!selectedSameDaySlot) return;
  
  // Add to selected times and close modal
  setSelectedRebookingTimes(prev => [
    ...prev,
    {
      day: selectedSameDaySlot.day,
      time: selectedSameDaySlot.time,
      date: selectedSameDaySlot.date,
      weekOffset
    }
  ]);
  
  setShowSameDayModal(false);
  setSelectedSameDaySlot(null);
  toast.success("Same-day session added to your selection");
};

const handlePayFully = async (daySlots: any[], totalPrice: number) => {
  if (daySlots.length === 0) return;
  
  setIsLoading(true);
  
  try {
    // Create appointment directly with Stripe payment
    const sortedSessions = [...daySlots].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const [firstSession, ...recurringSessions] = sortedSessions;

    // Create the appointment first
    console.log('Creating appointment with data:', {
      date: firstSession.date,
      localTimeZone: patientTimeZone,
      therapyType: 'individual',
      price: totalPrice,
      plan: 'Purchased From Rebooking',
      recurring: recurringSessions.map(session => ({ 
        date: session.date, 
        status: "in_progress", 
        payment: "unpaid" 
      })),
      discount: 0,
      discountPercentage: 0,
      isRebooking: true,
      paymentMethod: 'stripe'
    });

    const appointmentResponse = await fetch('/api/patient/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: firstSession.date,
        localTimeZone: patientTimeZone,
        therapyType: 'individual',
        price: totalPrice,
        plan: 'Single Online Therapy Session',
        recurring: recurringSessions.map(session => ({ 
          date: session.date, 
          status: "in_progress", 
          payment: "unpaid" 
        })),
        discount: 0,
        discountPercentage: 0,
        isRebooking: true,
        paymentMethod: 'stripe' // Flag to indicate Stripe payment
      }),
    });

    console.log('Appointment creation response status:', appointmentResponse.status);
    console.log('Appointment creation response headers:', Object.fromEntries(appointmentResponse.headers.entries()));

    if (!appointmentResponse.ok) {
      const errorData = await appointmentResponse.json();
      console.error('Appointment creation error:', errorData);
      console.error('Appointment creation error status:', appointmentResponse.status);
      throw new Error(errorData.error || `Failed to create appointment (${appointmentResponse.status})`);
    }
    
    const appointment = await appointmentResponse.json();
    console.log('Appointment response:', appointment);
    console.log('Appointment ID:', appointment.appointmentId);
    
    if (!appointment.appointmentId) {
      console.error('No appointment ID in response:', appointment);
      throw new Error("No appointment ID returned from session creation");
    }
    
    // Now redirect to Stripe checkout for payment
    console.log('Calling payment endpoint with appointment ID:', appointment.appointmentId);
    const paymentResponse = await fetch('/api/appointments/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointmentId: appointment.appointmentId
      }),
    });

    console.log('Payment response status:', paymentResponse.status);
    console.log('Payment response headers:', Object.fromEntries(paymentResponse.headers.entries()));
    
    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json();
      console.error('Payment error:', errorData);
      console.error('Payment error status:', paymentResponse.status);
      throw new Error(errorData.error || `Failed to initiate payment (${paymentResponse.status})`);
    }
    
    const paymentData = await paymentResponse.json();
    console.log('Payment response data:', paymentData);
    
    if (paymentData.redirectUrl) {
      window.location.href = paymentData.redirectUrl;
    } else {
      throw new Error("No redirect URL provided in payment response");
    }
  } catch (error: any) {
    toast.error(error.message || "Failed to initiate payment");
    setIsLoading(false);
  }
};

const handlePayUsingBalance = async (daySlots: any[], totalPrice: number, remainingAmount: number) => {
  if (daySlots.length === 0) return;
  
  if (remainingAmount > 0) {
    // Mixed payment: use balance + pay remaining via Stripe
    // Reuse the same logic as handlePayFully but with the remaining amount
    await handlePayFully(daySlots, remainingAmount);
  } else {
    // Use balance only - create appointment with balance payment
    const sortedSessions = [...daySlots].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const [firstSession, ...recurringSessions] = sortedSessions;

    // Create the appointment using balance
    const appointmentResponse = await fetch('/api/patient/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: firstSession.date,
        localTimeZone: patientTimeZone,
        therapyType: 'individual',
        price: totalPrice,
        plan: 'Single Online Therapy Session',
        recurring: recurringSessions.map(session => ({ 
          date: session.date, 
          status: "in_progress", 
          payment: "unpaid" 
        })),
        discount: 0,
        discountPercentage: 0,
        isRebooking: true,
        paymentMethod: 'balance' // Use balance payment method
      }),
    });

    if (!appointmentResponse.ok) {
      const errorData = await appointmentResponse.json();
      throw new Error(errorData.error || "Failed to create appointment");
    }
    
    const appointment = await appointmentResponse.json();
    console.log('Appointment created with balance:', appointment);
    
    toast.success("Appointment created successfully using your balance!");
    router.push("/dashboard/patient");
  }
};

const handleDayBooking = async (daySlots: any[], totalPrice: number) => {
  if (daySlots.length === 0) return;
  
  setIsLoading(true);
  
  try {
    // Sort sessions by date
    const sortedSessions = [...daySlots].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // First appointment is the main one, others are recurring
    const [firstSession, ...recurringSessions] = sortedSessions;

    // Create the appointment
    const response = await fetch('/api/patient/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: firstSession.date,
        localTimeZone: patientTimeZone,
        therapyType: 'individual',
        price: totalPrice,
        plan: 'Single Online Therapy Session',
        recurring: recurringSessions.map(session => ({ 
          date: session.date, 
          status: "in_progress", 
          payment: "unpaid" 
        })),
        discount: 0, // No discount for single day booking
        discountPercentage: 0,
        isRebooking: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Appointment creation failed:", errorData);
      throw new Error(errorData.error || "Failed to create appointment");
    }
    
    const result = await response.json();
    console.log("Appointment created successfully:", result);
    
    // Remove the booked slots from selection
    setSelectedRebookingTimes(prev => 
      prev.filter(slot => 
        !(slot.day === firstSession.day && slot.weekOffset === weekOffset)
      )
    );
    
    toast.success("Sessions booked successfully!");
    router.push(`/dashboard/patient`);
    router.refresh();
  } catch (error: any) {
    console.error("Booking error:", error);
    toast.error(error.message || "Failed to book sessions");
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 lg:px-8">
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Book More Sessions</h2>
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="hidden sm:inline">Back</span>
          </button>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Your Session Balance</h4>
          <div className="text-2xl font-bold text-blue-900">
            {sessionBalance.toString().substring(0, 8)} AED remaining
          </div>
        </div>
      </Card>

      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm sm:text-lg font-semibold text-gray-900">
            Available Times ({patientTimeZone})
            {isFetchingAvailability && (
              <Loader2 className="ml-2 h-4 w-4 animate-spin inline" />
            )}
          </h3>
         <div className="flex flex-col">
           <div className="text-sm text-gray-600 h-full text-center">
  Viewing: {format(getCurrentWeekDates()[0], 'MMM d')} - {format(getCurrentWeekDates()[6], 'MMM d, yyyy')}
</div>
          <div className="flex justify-end gap-2">
            <button
              onClick={handlePrevWeek}
              disabled={weekOffset === 0}
              className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
         </div>
        </div>
        
        {/* Discount Message */}
        {discountMessage && (
          <div className={`mb-6 p-4 rounded-lg border-2 ${
            priceDisplayColorClass === 'text-blue-600' ? 'bg-blue-50 border-blue-200' :
            priceDisplayColorClass === 'text-orange-600' ? 'bg-orange-50 border-orange-200' :
            'bg-purple-50 border-purple-200'
          }`}>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${selectedSlotsColorClass}`}></div>
              <p className={`font-medium ${priceDisplayColorClass}`}>
                {discountMessage}
              </p>
            </div>
          </div>
        )}
        
        {isFetchingAvailability ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : availability.length > 0 ? (
          <div className="space-y-6">
            {availability.map((day) => (
              <div key={day.date} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-gray-600" />
                  {day.day}, {format(new Date(day.date), 'MMM d')}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
{day.slots.map((slot) => {
  const isSelected = selectedRebookingTimes.some(
    s => s.day === day.day && s.time === slot.time && s.weekOffset === weekOffset
  );
  const isSameDaySlot = isSameDayBooking(new Date(day.date), slot.time);
  
  return (
    <button
      key={`${day.date}-${slot.time}`}
      onClick={() => slot.available && handleRebookingTimeSelect(day.day, slot.time, day.date)}
      disabled={!slot.available}
      className={`p-3 rounded-lg text-sm font-medium transition-all ${
        slot.available
          ? isSelected
            ? isSameDaySlot
              ? 'bg-orange-600 text-white shadow-md transform scale-105'
              : `${selectedSlotsColorClass} text-white shadow-md transform scale-105`
            : isSameDaySlot
            ? 'bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100'
            : 'bg-green-50 text-green-800 border border-green-200 hover:bg-green-100'
          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
      }`}
    >
      <div className="flex flex-col items-center">
        {slot.localTime && slot.uaeTime ? (
          <div className="flex flex-col text-center">
            <span className="font-medium text-sm">
              {slot.localTime} ({slot.patientTimeZone?.split('/')[1] || slot.patientTimeZone})
            </span>
            <div className="text-xs text-gray-500">
              {slot.uaeTime} (UAE)
            </div>
            {isSameDaySlot && (
              <span className="text-xs text-orange-600 font-medium mt-1">
                +64%
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <span>{slot.time}</span>
            {isSameDaySlot && (
              <span className="text-xs text-orange-600 font-medium mt-1">
                +64%
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
})}
                </div>
                
                {/* Day-specific booking buttons */}
                {(() => {
                  const daySlots = selectedRebookingTimes.filter(
                    s => s.day === day.day && s.weekOffset === weekOffset
                  );
                  
                  if (daySlots.length === 0) return null;
                  
                  const dayPrice = daySlots.reduce((total, session) => {
                    const sessionDate = new Date(session.date);
                    const isSameDay = isSameDayBooking(sessionDate, session.time);
                    return total + (isSameDay ? 
                      SAME_DAY_PRICING.BASE_PRICE * SAME_DAY_PRICING.SURCHARGE_MULTIPLIER : 
                      SINGLE_SESSION_PRICE
                    );
                  }, 0);
                  
                  // Calculate total price for ALL selected sessions
                  const totalSelectedPrice = selectedRebookingTimes.reduce((total, session) => {
                    const sessionDate = new Date(session.date);
                    const isSameDay = isSameDayBooking(sessionDate, session.time);
                    return total + (isSameDay ? 
                      SAME_DAY_PRICING.BASE_PRICE * SAME_DAY_PRICING.SURCHARGE_MULTIPLIER : 
                      SINGLE_SESSION_PRICE
                    );
                  }, 0);
                  
                  // Apply bulk discounts
                  let discountedTotal = totalSelectedPrice;
                  let discountPercent = 0;
                  if (selectedRebookingTimes.length >= 8) {
                    discountPercent = EIGHT_SESSION_DISCOUNT_PERCENTAGE;
                    discountedTotal = totalSelectedPrice * (1 - discountPercent);
                  } else if (selectedRebookingTimes.length >= 4) {
                    discountPercent = FOUR_SESSION_DISCOUNT_PERCENTAGE;
                    discountedTotal = totalSelectedPrice * (1 - discountPercent);
                  }
                  
                  const remainingAmount = discountedTotal - sessionBalance;
                  
                  const totalSelectedSlots = selectedRebookingTimes.length;
                  const remainingSlotsForDiscount = 4 - totalSelectedSlots;
                  const canGetDiscount = remainingSlotsForDiscount > 0 && remainingSlotsForDiscount <= 3;
                  
                  return (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h5 className="font-semibold text-gray-800">
                            {daySlots.length} Session{daySlots.length !== 1 ? 's' : ''} Selected
                          </h5>
                          <p className="text-sm text-gray-600">
                            Total: {dayPrice} AED
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Your Balance:</p>
                          <p className="font-semibold text-gray-800">{sessionBalance.toFixed(2)} AED</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => handlePayFully(daySlots, discountedTotal)}
                          disabled={isLoading}
                          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                        >
                          {isLoading ? 'Processing...' : `Pay Fully ${discountedTotal.toFixed(2)} AED`}
                        </button>
                        
                        <button
                          onClick={() => handlePayUsingBalance(daySlots, discountedTotal, remainingAmount)}
                          disabled={isLoading}
                          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                            remainingAmount > 0
                              ? 'bg-orange-600 text-white hover:bg-orange-700'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {isLoading ? 'Processing...' : 
                           remainingAmount > 0 ? 
                           `Pay Using Balance + ${remainingAmount.toFixed(2)} AED` : 
                           'Pay Using Balance'}
                        </button>
                        
                        {canGetDiscount && (
                          <button
                            onClick={() => setShowDiscountOption(true)}
                            className="flex-1 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
                          >
                            Choose {remainingSlotsForDiscount} More for 10% Off
                          </button>
                        )}
                      </div>
                      
                      {remainingAmount > 0 && (
                        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <p className="text-sm text-orange-800 font-medium mb-2">
                            💳 Book Using Balance + Pay Remaining
                          </p>
                          <p className="text-sm text-orange-700">
                            Your balance: {sessionBalance.toFixed(2)} AED • 
                            Total cost: {discountedTotal.toFixed(2)} AED • 
                            Remaining: {remainingAmount.toFixed(2)} AED
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No available time slots found for this therapist.
          </div>
        )}
      </Card>

      {selectedRebookingTimes.length > 0 && (
        <>
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Times</h3>
            <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {selectedRebookingTimes.length} session{selectedRebookingTimes.length !== 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${selectedSlotsColorClass}`}></div>
                  <span className={`text-sm font-medium ${priceDisplayColorClass}`}>
                    {selectedRebookingTimes.length >= 8 ? '20% Discount' : 
                     selectedRebookingTimes.length >= 4 ? '10% Discount' : 
                     'Regular Price'}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2 mb-4">
<div className="space-y-2 mb-4">
  {selectedRebookingTimes
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((session, index) => {
      const sessionDate = new Date(session.date);
      const formattedDate = format(sessionDate, 'EEE, MMM d');
      
      return (
        <div 
          key={index} 
          className={`flex items-center justify-between p-3 rounded-lg border-2 ${
            selectedSlotsColorClass === 'bg-blue-600' ? 'bg-blue-50 border-blue-200' :
            selectedSlotsColorClass === 'bg-orange-600' ? 'bg-orange-50 border-orange-200' :
            'bg-purple-50 border-purple-200'
          }`}
        >
          <div>
            <span className={`font-medium ${
              selectedSlotsColorClass === 'bg-blue-600' ? 'text-blue-900' :
              selectedSlotsColorClass === 'bg-orange-600' ? 'text-orange-900' :
              'text-purple-900'
            }`}>
              {session.day} {session.time}
            </span>
            <div className="text-xs text-gray-500 mt-1">
              {formattedDate} (Week {session.weekOffset + 1})
            </div>
          </div>
          <button
            onClick={() => {
              const newTimes = selectedRebookingTimes.filter((_, i) => i !== index);
              setSelectedRebookingTimes(newTimes);
              calculatePriceAndDiscount(newTimes.length);
            }}
            className="text-red-600 hover:text-red-800"
          >
            Remove
          </button>
        </div>
      );
    })}
</div>
            </div>

            {/* Price Summary */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700">Subtotal:</span>
                <span className="font-medium">{originalPrice.toFixed(2)} AED</span>
              </div>
              {originalPrice > calculatedPrice && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Discount:</span>
                  <span className="font-medium text-green-600">
                    -{(originalPrice - calculatedPrice).toFixed(2)} AED
                  </span>
                </div>
              )}
            </div>

     <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 mb-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Purchase Session Packages</h3>
    <div className="mb-4">
      <p className="text-gray-700 mb-2">Selected Sessions: {selectedRebookingTimes.length}</p>
      <p className={`text-2xl font-bold mb-2 ${priceDisplayColorClass}`}>
        Total Price: {calculatedPrice.toFixed(2)} AED
      </p>
      <p className="text-sm text-gray-600">
        Available Balance: {sessionBalance.toFixed(2)} AED
      </p>
    </div>
    
    <h4 className="font-medium text-gray-900 mb-3">Session Packages (Informational)</h4>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="p-3 bg-gray-100 text-gray-600 rounded-lg text-sm cursor-not-allowed">
        Buy 1 Session<br />
        <span className="font-bold">110 AED</span>
      </div>
      <div className="p-3 bg-gray-100 text-gray-600 rounded-lg text-sm cursor-not-allowed">
        Buy 4 Sessions<br />
        <span className="font-bold">396 AED</span>
        <span className="text-xs block">10% off</span>
      </div>
      <div className="p-3 bg-gray-100 text-gray-600 rounded-lg text-sm cursor-not-allowed">
        Buy 8 Sessions<br />
        <span className="font-bold">704 AED</span>
        <span className="text-xs block">20% off</span>
      </div>
    </div>
  </Card>


          </Card>
          
          {/* Purchase Options */}
          {/* <Card className="p-4 mb-6">
            <button
              onClick={() => setShowPurchaseOptions(!showPurchaseOptions)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-gray-900">Purchase Session Packages</span>
              <div className={`transform transition-transform duration-200 ${showPurchaseOptions ? 'rotate-180' : ''}`}>
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
          </Card> */}
                </>
      )}

      {/* Same-Day Booking Modal */}
      {selectedSameDaySlot && (
        <SameDayBookingModal
          open={showSameDayModal}
          onOpenChange={setShowSameDayModal}
          selectedDate={new Date(selectedSameDaySlot.date)}
          selectedTime={selectedSameDaySlot.time}
          sessionBalance={sessionBalance}
          onUseBalance={handleSameDayUseBalance}
          onPayNow={handleSameDayPayNow}
          onPayRemaining={handleSameDayPayRemaining}
          isLoading={isLoading}
          isReschedule={false}
        />
      )}
    </div>
  );
}