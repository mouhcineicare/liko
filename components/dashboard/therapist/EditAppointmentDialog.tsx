"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, addDays, isBefore, isValid } from "date-fns"
import { Calendar as CalendarIcon, Loader2, Plus, Trash2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { formatInTimeZone, toZonedTime } from "date-fns-tz"

interface EditAppointmentDialogProps {
  appointmentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface RecurringSession {
  date: string;
  status: string;
  payment: string;
  _id?: string;
}

type AppointmentUpdateData = {
  date: Date;
  meetingLink: string;
  comment: string;
  patientTimezone: string;
  isRecurring?: boolean;
  recurringIndex?: number;
};

export default function EditAppointmentDialog({
  appointmentId,
  open,
  onOpenChange,
  onSuccess,
}: EditAppointmentDialogProps) {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [comment, setComment] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hour, setHour] = useState<number>(12)
  const [minute, setMinute] = useState<number>(0)
  const [meetingLink, setMeetingLink] = useState("")
  const [patientTimeZone, setPatientTimeZone] = useState("Asia/Dubai")
  const [browserTimeZone, setBrowserTimeZone] = useState("UTC")
  const [recurringSessions, setRecurringSessions] = useState<RecurringSession[]>([])
  const [selectedSessionIndex, setSelectedSessionIndex] = useState<number | null>(null)
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(undefined)
  const [hasInvalidDate, setHasInvalidDate] = useState(false)

  // Get browser timezone when component mounts
  useEffect(() => {
    setBrowserTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  }, [])

  useEffect(() => {
    if (open && appointmentId) {
      fetchAppointmentDetails()
    } else {
      // Reset state when dialog closes
      setDate(new Date())
      setAppointmentDate(undefined)
      setHasInvalidDate(false)
    }
  }, [open, appointmentId])

  const safeParseDate = (dateString: string | Date | null | undefined): Date | null => {
    if (!dateString) return null
    
    try {
      const date = new Date(dateString)
      return isValid(date) ? date : null
    } catch (error) {
      return null
    }
  }

  const fetchAppointmentDetails = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/therapist/appointments/${appointmentId}`)
      const data = await response.json()
      
      const parsedDate = safeParseDate(data.date)
      const fallbackDate = new Date() // Today's date as fallback
      setHasInvalidDate(!parsedDate)

      if (parsedDate) {
        setAppointmentDate(parsedDate)
        setDate(parsedDate)
        setHour(parsedDate.getHours())
        setMinute(parsedDate.getMinutes())
      } else {
        setAppointmentDate(fallbackDate)
        setDate(fallbackDate)
        setHour(fallbackDate.getHours())
        setMinute(fallbackDate.getMinutes())
      }

      setComment(data.comment || "")
      setMeetingLink(data.meetingLink || "")
      setPatientTimeZone(data.patientTimezone || "Asia/Dubai")
      setRecurringSessions(data.recurring || [])
    } catch (error) {
      console.error("Error fetching appointment details:", error)
      toast.error("Failed to load appointment details")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDateChange = (newDate: Date | undefined) => {
    if (!newDate) return
    
    // Check if the selected date is in the past
    const now = new Date()
    if (isBefore(newDate, now)) {
      toast.error("Please select a future date")
      return
    }
    
    setDate(newDate)
    setHasInvalidDate(false)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value
    const [hours, minutes] = time.split(':').map(Number)
    setHour(hours)
    setMinute(minutes)
  }

  const handleSessionSelect = (index: number | null) => {
    setSelectedSessionIndex(index)
    if (index === null && appointmentDate) {
      // Reset to main appointment date
      setDate(appointmentDate)
      setHour(appointmentDate.getHours())
      setMinute(appointmentDate.getMinutes())
      setHasInvalidDate(!isValid(appointmentDate))
    } else if ((index || index===0) && recurringSessions[index]) {
      // Set to selected recurring session date
      const sessionDate = safeParseDate(recurringSessions[index].date) || new Date()
      setDate(sessionDate)
      setHour(sessionDate.getHours())
      setMinute(sessionDate.getMinutes())
      setHasInvalidDate(!isValid(new Date(recurringSessions[index].date)))
    }
  }

  const handleSubmit = async () => {
    if (!date) {
      toast.error("Please select a date")
      return
    }

    // Create new date with selected time
    const updatedDate = new Date(date)
    updatedDate.setHours(hour)
    updatedDate.setMinutes(minute)
    updatedDate.setSeconds(0)
    updatedDate.setMilliseconds(0)

    // Final check to ensure date is valid and in the future
    if (!isValid(updatedDate)) {
      toast.error("Invalid date selected")
      return
    }

    const now = new Date()
    if (isBefore(updatedDate, now)) {
      toast.error("Appointment must be scheduled for a future date and time")
      return
    }

    setIsSubmitting(true)
    try {
      const updateData: AppointmentUpdateData = {
        date: updatedDate,
        meetingLink,
        comment,
        patientTimezone: patientTimeZone,
      }

      // Add recurring session info if editing a recurring session
      if (selectedSessionIndex !== null) {
        updateData.isRecurring = true
        updateData.recurringIndex = selectedSessionIndex
      }

      const response = await fetch(`/api/therapist/appointments/${appointmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update appointment")
      }

      toast.success("Appointment updated successfully")
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Error updating appointment:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update appointment")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCurrentTimeString = () => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }

  const formatLocalTime = (date: Date) => {
    if (!isValid(date)) {
      return "Invalid date"
    }
    return format(date, 'MMM d, yyyy HH:mm')
  }

  const formatTimeForTimeZone = (date: Date, timeZone: string) => {
    if (!isValid(date)) {
      return "Invalid date"
    }
    try {
      return formatInTimeZone(date, timeZone, 'MMM d, yyyy HH:mm')
    } catch (error) {
      console.error("Timezone conversion error:", error)
      return format(date, 'MMM d, yyyy HH:mm')
    }
  }

  // Function to disable past dates in calendar
  const isDateDisabled = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return isBefore(date, today)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Appointment</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {hasInvalidDate && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      This appointment had an invalid date. We've set it to today's date as a fallback. Please select a valid date.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Session Selection */}
            <div className="space-y-2">
              <Label>Select Session to Edit</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedSessionIndex === null ? "default" : "outline"}
                  onClick={() => handleSessionSelect(null)}
                >
                  Main Session
                </Button>
                {recurringSessions.map((_session, index: number) => (
                  <Button
                    key={index}
                    variant={selectedSessionIndex === index ? "default" : "outline"}
                    onClick={() => handleSessionSelect(index)}
                  >
                    Session {index + 1}
                  </Button>
                ))}
              </div>
            </div>

            {/* Date and Time Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Appointment Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar 
                      mode="single" 
                      selected={date} 
                      onSelect={handleDateChange} 
                      initialFocus
                      disabled={isDateDisabled}
                      fromDate={new Date()} // Only allow dates from today onward
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={getCurrentTimeString()}
                    onChange={handleTimeChange}
                  />
                </div>
              </div>

              {/* Timezone Display */}
              <div className="space-y-2">
                <Label>Timezone Information</Label>
                <div className="p-3 border rounded-md bg-gray-50">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium">Patient Time</h4>
                      <p className="text-sm">
                        {date && formatTimeForTimeZone(
                          new Date(date.setHours(hour, minute)), 
                          patientTimeZone
                        )} ({patientTimeZone})
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium">Your Time</h4>
                      <p className="text-sm">
                        {date && formatLocalTime(
                          new Date(date.setHours(hour, minute))
                        )} ({browserTimeZone})
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Meeting Link */}
            <div className="space-y-2">
              <Label htmlFor="meetingLink">Meeting Link</Label>
              <Input
                id="meetingLink"
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/..."
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="comment">Notes</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add any notes about this appointment..."
                className="min-h-[100px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}