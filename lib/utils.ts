import { clsx, type ClassValue } from "clsx";
import { setHours, setMinutes } from "date-fns";
import { format, toZonedTime } from "date-fns-tz";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export const updateUserTimezone = async (timeZone?: string) => {
  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    if (timeZone === localTimeZone) {
      console.log("User timezone is already set to the local timezone.");
      return;
     }
    const response = await fetch(`/api/timezone`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ timeZone: localTimeZone }),
    });

    if (!response.ok) {
      throw new Error("Failed to update user timezone");
    }
  } catch (error) {
    console.error("Error updating user timezone:", error);
  }
}



export function isValidBase64Image(str: string) {
  if (!str?.startsWith("data:image/")) return false;
  try {
    window.atob(str.split(",")[1]);
    return true;
  } catch (e) {
    return false;
  }
}

export function getImageSrc(
  image: string | null | undefined,
  defaultImage: string
): string {
  if (!image) return defaultImage;
  return isValidBase64Image(image) ? image : defaultImage;
}

export async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        const maxSize = 200; // Max width/height in pixels
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG with reduced quality
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}



/**
 * Converts any date/time to UAE timezone (GMT+4)
 * @param dateInput - Can be Date object, ISO string, timestamp, or any valid date string
 * @param options - Optional formatting and display options
 * @returns Formatted UAE time string or object with both UAE time and offset info
 */
export function convertToUAETime(
  dateInput: Date | string | number,
  options: {
    format?: 'full' | 'date' | 'time' | 'datetime' | 'iso';
    displayTimezone?: boolean;
    returnDetails?: boolean;
  } = {}
): string | { uaeTime: string; originalTime: string; offset: string; uaeOffset: string } {
  // Default options
  const {
    format = 'datetime',
    displayTimezone = true,
    returnDetails = false,
  } = options;

  // Parse input date
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date input');
  }

  // Get user's local timezone info
  const userTimeStr = date.toLocaleString();
  const userOffset = -date.getTimezoneOffset() / 60; // in hours

  // Better UAE time conversion using Intl.DateTimeFormat
  const uaeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dubai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const uaeTimeStr = uaeFormatter.format(date);

  // For ISO format, we need to manually adjust the time
  let isoTime = '';
  if (format === 'iso') {
    const adjustedDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000 - (4 * 3600000)));
    isoTime = adjustedDate.toISOString();
  }

  // Format based on options
  let formattedTime: string;
  
  switch (format) {
    case 'date':
      formattedTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dubai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);
      break;
    case 'time':
      formattedTime = new Intl.DateTimeFormat('en-US', { 
        timeZone: 'Asia/Dubai',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(date);
      break;
    case 'iso':
      formattedTime = isoTime;
      break;
    case 'full':
      formattedTime = new Intl.DateTimeFormat('en-US', { 
        timeZone: 'Asia/Dubai',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      }).format(date);
      break;
    default: // 'datetime'
      formattedTime = uaeTimeStr;
  }

  // Add timezone info if requested
  if (displayTimezone && format !== 'iso') {
    formattedTime += ` (UAE Time)`;
  }

  // Return based on whether detailed info is needed
  if (returnDetails) {
    return {
      uaeTime: formattedTime,
      originalTime: userTimeStr,
      offset: `UTC${userOffset >= 0 ? '+' : ''}${userOffset}`,
      uaeOffset: '+4'
    };
  }

  return formattedTime;
}

// Additional helper functions


/**
 * Internal function to convert Date object to UAE timezone
 */
function convertTimeToUAE(date: Date): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
}

/**
 * Checks if two dates are in the same UAE day
 */
export function isSameUAEDay(date1: Date, date2: Date): boolean {
  const uaeDate1 = convertTimeToUAE(date1);
  const uaeDate2 = convertTimeToUAE(date2);
  return uaeDate1.getFullYear() === uaeDate2.getFullYear() &&
         uaeDate1.getMonth() === uaeDate2.getMonth() &&
         uaeDate1.getDate() === uaeDate2.getDate();
}


export const convertTimeToTimeZone = (startDate: string, timeZone: string, selectedDate: Date) => {
    try{
      const date = new Date(startDate);
      const localTime = toZonedTime(date, timeZone);
      return format(localTime, "h:mm a");

    }catch{
      if(!selectedDate) return;
      const [hour, minute] = startDate.split(":").map(Number);  
    // Create a new Date based on selectedDate but replace the hour/minute
    let dateWithTime = setHours(setMinutes(selectedDate, minute), hour);
  
    // Convert to target timezone
    const zonedTime = toZonedTime(dateWithTime, timeZone);
  
    // Format the final result
    return format(zonedTime, "h:mm a");
    }
  };


  // used for convertion in front end
export function timeZoneConverter(
  dateInput: Date | string,
  time: string,
  fromTimeZone: string,
  toTimeZone: string,
  isFullDate: boolean = false
): string {
  // Combine date and time
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(dateInput);
  date.setHours(hours, minutes, 0, 0);

  // Create formatter options based on isFullDate
  const options: Intl.DateTimeFormatOptions = {
    timeZone: toTimeZone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  };

  if (isFullDate) {
    options.year = 'numeric';
    options.month = '2-digit';
    options.day = '2-digit';
    options.weekday = 'long';
  }

  // Format the time
  const formatter = new Intl.DateTimeFormat('en-US', options);
  let formattedTime = formatter.format(date);

  // Add timezone info
  const timeZoneName = new Intl.DateTimeFormat('en-US', {
    timeZone: toTimeZone,
    timeZoneName: 'short'
  }).format(date).split(', ')[1];

  return `${formattedTime} (${timeZoneName})`;
}


// used on calendar availaibility conversion to the patient timezone
export function convertTimeZone(
  date: Date,
  fromTimeZone: string,
  toTimeZone: string,
  format: 'date' | 'time' | 'datetime' = 'datetime'
): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: toTimeZone,
    hour12: false
  };

  if (format === 'date' || format === 'datetime') {
    options.year = 'numeric';
    options.month = '2-digit';
    options.day = '2-digit';
  }

  if (format === 'time' || format === 'datetime') {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  const formatter = new Intl.DateTimeFormat('en-US', options);
  return formatter.format(date);
}

export function adjustDateToTimeZone(date: Date, fromTimeZone: string, toTimeZone: string): Date {
  // Create a formatter to get the timezone offset
  const fromFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: fromTimeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  const toFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: toTimeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Get the formatted date strings
  const fromDateStr = fromFormatter.format(date);
  const toDateStr = toFormatter.format(date);

  // Calculate the difference in hours
  const fromDate = new Date(fromDateStr);
  const toDate = new Date(toDateStr);
  const diffHours = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60);

  // Adjust the original date
  const adjustedDate = new Date(date.getTime() + diffHours * 60 * 60 * 1000);
  return adjustedDate;
}

/**
 * Normalize appointment sessions (recurring) to a consistent object array.
 * Handles both old (string) and new (object) formats, parses dates, and flags invalid entries.
 *
 * @param mainDate - The main appointment date (string)
 * @param recurring - Array of strings or objects (recurring sessions)
 * @param price - Appointment price (number)
 * @param totalSessions - Total number of sessions (number)
 * @returns Array of normalized session objects
 */
export function normalizeAppointmentSessions(
  mainDate: string,
  recurring: (string | { date: string; status?: string; payment?: string })[] = [],
  price: number = 0,
  totalSessions: number = 1
) {
  // Helper to parse date and check validity
  function parseDate(dateStr: string): { iso: string | null, invalid: boolean } {
    if (!dateStr) return { iso: null, invalid: true };
    // Try ISO first
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return { iso: d.toISOString(), invalid: false };
    // Try common formats (e.g. DD/MM/YYYY, MM/DD/YYYY)
    const parts = dateStr.split(/[\/-]/);
    if (parts.length === 3) {
      // Try DD/MM/YYYY
      const d1 = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      if (!isNaN(d1.getTime())) return { iso: d1.toISOString(), invalid: false };
      // Try MM/DD/YYYY
      const d2 = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
      if (!isNaN(d2.getTime())) return { iso: d2.toISOString(), invalid: false };
    }
    return { iso: null, invalid: true };
  }

  // Normalize main date
  const sessions: any[] = [];
  const sessionPrice = totalSessions > 0 ? price / totalSessions : price;
  const mainParsed = parseDate(mainDate);
  if (mainParsed.iso) {
    sessions.push({
      date: mainParsed.iso,
      status: 'in_progress',
      payment: 'not_paid',
      price: sessionPrice,
      _legacy: false,
      invalid: false
    });
  } else {
    sessions.push({
      date: mainDate,
      status: 'in_progress',
      payment: 'not_paid',
      price: sessionPrice,
      _legacy: false,
      invalid: true
    });
  }

  // Normalize recurring
  recurring.forEach((item) => {
    if (typeof item === 'string') {
      const parsed = parseDate(item);
      sessions.push({
        date: parsed.iso || item,
        status: 'in_progress',
        payment: 'not_paid',
        price: sessionPrice,
        _legacy: true,
        invalid: parsed.invalid
      });
    } else if (typeof item === 'object' && item !== null) {
      const parsed = parseDate(item.date);
      sessions.push({
        date: parsed.iso || item.date,
        status: item.status || 'in_progress',
        payment: item.payment || 'not_paid',
        price: sessionPrice,
        _legacy: false,
        invalid: parsed.invalid
      });
    }
  });

  // Remove duplicate dates (keep first occurrence)
  const seen = new Set();
  return sessions.filter(sess => {
    if (!sess.date || seen.has(sess.date)) return false;
    seen.add(sess.date);
    return true;
  });
}