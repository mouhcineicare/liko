"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Calendar, Clock, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toZonedTime } from "date-fns-tz"

interface CollapsibleDatesProps {
  dates: string[]
  completedSessions: number
  slotEndedStyle: (index: number) => string
  therapyTimeZone?: string
}

export default function CollapsibleDates({ dates, completedSessions, slotEndedStyle, therapyTimeZone }: CollapsibleDatesProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const patientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const convertTimeToTimeZone = (startDate: string, timeZone: string) => {
        const date = new Date(startDate);
        const localTime = toZonedTime(date, timeZone);
        return format(localTime, "h:mm a");
  };

  if (dates.length === 0) return null

  return (
    <div className="mt-2">
      {/* Toggle button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-2 h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-3.5 w-3.5 mr-1" />
            Hide additional Sessions
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5 mr-1" />
            Show {dates.length} more {dates.length === 1 ? "session" : "sessions"}
          </>
        )}
      </Button>

      {/* Collapsible content */}
      {isExpanded && (
        <div className="mt-2 pl-1 border-l-2 border-gray-100">
          {dates.map((date, index) => (
            <div key={date} className={slotEndedStyle(index + 2)}>
              <div className="flex items-center text-sm text-gray-500 mt-2">
                <Calendar className="w-4 h-4 mr-2" />
                {format(new Date(date), "EEEE, MMMM d, yyyy")}
              </div>
              <div className="flex items-center text-sm text-gray-500 mt-1 mb-2">
                <Clock className="w-4 h-4 mr-2" />
                {convertTimeToTimeZone(date ,patientTimeZone)}
                          {' | '}
                {convertTimeToTimeZone(date , therapyTimeZone || 'Asia/Dubai')} {therapyTimeZone || 'Asia/Dubai'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

