import { format, formatInTimeZone, toZonedTime } from "date-fns-tz";

// utils/dateUtils.ts
export const isValidDate = (date: any): date is Date => {
  return date instanceof Date && !isNaN(date.getTime());
};

export const safeParseDate = (dateString: string | Date | null | undefined): Date | null => {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    return isValidDate(date) ? date : null;
  } catch (error) {
    return null;
  }
};

export const formatAppointmentDate = (dateString: string | Date | null | undefined): string => {
  const date = safeParseDate(dateString);
  if (!date) return 'Date not set';
  
  return format(date, 'MMM d, yyyy');
};

export const convertAppointmentTimes = (
  dateString: string | Date | null | undefined,
  patientTimezone: string,
  therapistTimezone: string
) => {
  const date = safeParseDate(dateString);
  if (!date) {
    return {
      patientTime: 'Invalid time',
      therapistTime: 'Invalid time',
      patientTimezone,
      therapistTimezone,
      isValid: false
    };
  }

  try {
    const patientTime = formatInTimeZone(date, patientTimezone, 'HH:mm');
    const therapistZonedTime = toZonedTime(date, therapistTimezone);
    const therapistTime = formatInTimeZone(therapistZonedTime, therapistTimezone, 'HH:mm');
    
    return {
      patientTime,
      therapistTime,
      patientTimezone,
      therapistTimezone,
      isValid: true
    };
  } catch (error) {
    console.error('Timezone conversion error:', error);
    const fallbackTime = format(date, 'HH:mm');
    return {
      patientTime: fallbackTime,
      therapistTime: fallbackTime,
      patientTimezone,
      therapistTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      isValid: false
    };
  }
};