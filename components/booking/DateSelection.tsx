"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isSameDay } from "date-fns";

interface DateSelectionProps {
  availableDates: Date[];
  dayOffset: number;
  handleDateSelect: (date: Date) => void;
  handleBack: () => void;
  handleNext: () => void;
  selectedDate: Date | null;
  isFetchingDays: boolean;
  isAuthenticated: boolean;
  availableDayNames: string[];
  isSameDayBookingAllowed: boolean;
}

export function DateSelection({
  availableDates,
  dayOffset,
  handleDateSelect,
  handleBack,
  handleNext,
  selectedDate,
  isFetchingDays,
  isAuthenticated,
  availableDayNames,
  isSameDayBookingAllowed
}: DateSelectionProps) {
  return (
    <div className="space-y-2">
    {!isSameDayBookingAllowed && (
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Select Date</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleBack} disabled={dayOffset === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {isFetchingDays && isAuthenticated ? (
          [...Array(15)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))
        ) : (
          availableDates.map((date) => {
            const dayName = format(date, 'EEEE');
            const isToday = isSameDay(date, new Date());
            const isAvailable =
              (!isAuthenticated || availableDayNames.includes(dayName)) &&
              (isSameDayBookingAllowed || !isToday);
          
            return (
              <Card
                key={date.toISOString()}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedDate && isSameDay(selectedDate, date)
                    ? "bg-blue-50 border-blue-200"
                    : "bg-white hover:bg-gray-50"
                } ${
                  !isAvailable ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={() => {
                  if (isAvailable) {
                    handleDateSelect(date);
                  }
                }}
              >
                <p className="text-sm font-medium text-center">{format(date, "EEE")}</p>
                <p className="text-lg font-bold text-center">{format(date, "d")}</p>
                <p className="text-xs text-center text-gray-500">{format(date, "MMM")}</p>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}