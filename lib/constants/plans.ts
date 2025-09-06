import { isSameDay, addDays } from "date-fns";

export const plans = [
  {
    id: "single-session",
    title: "Single Online Therapy Session",
    duration: "1h",
    price: 90.00,
    description: "One-time therapy session with a licensed professional.",
    features: ["1-hour session", "Choose your therapist", "Video consultation"],
  },
  {
    id: "monthly-care",
    title: "Monthly Care Plan",
    duration: "4h",
    price: 81.00,
    totalPrice: 324.00,
    description: "4 Online Therapy Sessions per month",
    features: ["4 sessions per month", "Flexible scheduling", "Progress tracking", "Priority booking"],
  },
  {
    id: "intensive-care",
    title: "Monthly Intensive Care Plan",
    duration: "8h",
    price: 73.75,
    totalPrice: 590.00,
    description: "8 Online Therapy Sessions per month",
    features: ["8 sessions per month", "Comprehensive care", "Weekly progress reviews", "24/7 messaging support"],
  },
];

export const SAME_DAY_PRICING = {
  BASE_PRICE: 110,
  SURCHARGE_MULTIPLIER: 1.64, // 64% surcharge
  SURCHARGE_PERCENTAGE: 64,
} as const;

export const isSameDayBooking = (selectedDate: Date, selectedTime: string): boolean => {
  const now = new Date();
  const isToday = isSameDay(selectedDate, now);
  
  // If it's not today, check if it's tomorrow and within 24 hours
  if (!isToday) {
    const tomorrow = addDays(now, 1);
    const isTomorrow = isSameDay(selectedDate, tomorrow);
    if (!isTomorrow) return false;
    
    // For tomorrow, check if it's within 24 hours from now
    const selectedDateTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    selectedDateTime.setHours(hours, minutes, 0, 0);
    
    const timeDiff = selectedDateTime.getTime() - now.getTime();
    const hoursUntilAppointment = timeDiff / (1000 * 60 * 60);
    
    return hoursUntilAppointment < 24 && hoursUntilAppointment > 0;
  }
  
  // If it's today, it's always same-day booking
  return true;
};