"use client";

import { Card } from "@/components/ui/card";

interface RecurringSelectionProps {
  totalSessions: number;
  selectedRecurringDays: string[];
  handleRecurringDaySelect: (day: string) => void;
  selectedTimes: { [key: string]: string };
  handleDayTimeSelect: (day: string, time: string) => void;
}

export function RecurringSelection({
  totalSessions,
  selectedRecurringDays,
  handleRecurringDaySelect,
  selectedTimes,
  handleDayTimeSelect
}: RecurringSelectionProps) {
  const generateRecurringTimeSlots = () => {
    return Array.from({ length: 24 }, (_, i) => {
      const hour = i;
      return {
        start: `${hour.toString().padStart(2, "0")}:00`,
        end: `${((hour + 1) % 24).toString().padStart(2, "0")}:00`,
      };
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Select Recurring Days</h3>
        <p className="text-sm text-gray-500">
          Choose {totalSessions <= 4 ? "1 day" : "up to 2 days"} for your recurring sessions.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(
          (day) => (
            <Card
              key={day}
              className={`p-3 cursor-pointer transition-colors ${
                selectedRecurringDays.includes(day)
                  ? "bg-blue-50 border-blue-200"
                  : "bg-white hover:bg-gray-50"
              }`}
              onClick={() => handleRecurringDaySelect(day)}
            >
              <p className="text-center">{day.substring(0,3).toUpperCase()}</p>
            </Card>
          )
        )}
      </div>

      {selectedRecurringDays.length > 0 && (
        <div className="space-y-4">
          {selectedRecurringDays.map((day) => (
            <div key={day} className="space-y-2">
              <h4 className="font-medium">Select time for {day}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-[300px] overflow-y-auto">
                {generateRecurringTimeSlots().map((slot, index) => (
                  <Card
                    key={index}
                    className={`p-2 cursor-pointer transition-colors ${
                      selectedTimes[day] === slot.start
                        ? "bg-blue-50 border-blue-200"
                        : "bg-white hover:bg-gray-50"
                    }`}
                    onClick={() => handleDayTimeSelect(day, slot.start)}
                  >
                    <p className="text-center text-sm">{slot.start}</p>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}