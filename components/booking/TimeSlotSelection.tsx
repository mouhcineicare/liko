"use client";
import { Card, Skeleton } from "antd";

interface TimeSlot {
  start: string;
  end: string;
  time: string;
  therapistTime?: string;
  patientTime?: string;
}

// patient time is not used on this component because it shows the original slots so the correct values are on the therapist time

interface TimeSlotSelectionProps {
  isFetchingSlots: boolean;
  availableSlots: TimeSlot[];
  selectedSlot: string;
  handleTimeSelect: (time?: string) => void;
  isAuthenticated: boolean;
  therapistId: string | null;
  therapistTimeZone: string;
  isFiveMinuteBooking?: boolean;
  fiveMinuteSlot?: string | null;
  selectedDate: Date | null;
}

export function TimeSlotSelection({
  isFetchingSlots,
  availableSlots,
  selectedSlot,
  handleTimeSelect,
  isFiveMinuteBooking = false,
  fiveMinuteSlot = null,
  isAuthenticated
}: TimeSlotSelectionProps) {
  const patientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="space-y-3 w-full">
      <h3 className="text-md font-medium">
        {isFiveMinuteBooking ? "Immediate Session" : `Pick preferred appointment time (${patientTimeZone})`}
      </h3>
      
      {isFiveMinuteBooking && fiveMinuteSlot ? (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
          <p className="text-blue-700">
            Starts at ~ {fiveMinuteSlot}
          </p>
        </div>
      ) : (
        <>
          {isFetchingSlots ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-2 rounded-md" active />
              ))}
            </div>
          ) : availableSlots.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {availableSlots.map((slot, index) => (
                <button
                  key={index}
                  className={`p-2 text-sm rounded-md transition-all bg-white ${
                    selectedSlot === slot?.patientTime
                      ? "border-2 border-blue-500 bg-blue-50"
                      : "border border-gray-200 hover:border-blue-300"
                  }`}
                  onClick={() => handleTimeSelect(slot?.patientTime)}
                >
                  <div className="font-medium">{slot?.patientTime}</div>
                 { isAuthenticated &&( <div className="text-xs text-gray-500">
                    ({slot?.therapistTime} therapist time)
                  </div>)}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm py-2">No available slots</p>
          )}
        </>
      )}
    </div>
  );
}