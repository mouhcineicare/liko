"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import Appointment from "@/lib/db/models/Appointment"

interface CancellationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointmentId: string
  isWithin24Hours: boolean
  onCancel: (appointmentId: string, charge: boolean) => Promise<void>
  onReschedule: (appointmentId: string, isWithin24Hours: boolean) => void
  isSingleSession: boolean
  hasNoShow: boolean
}

export default function CancellationDialog({
  open,
  onOpenChange,
  appointmentId,
  isWithin24Hours,
  onCancel,
  onReschedule,
  isSingleSession,
  hasNoShow
}: CancellationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCancel = async (charge: boolean) => {
    setIsSubmitting(true)
    try {
      await onCancel(appointmentId, charge)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] w-[calc(100%-2rem)] max-w-full mx-auto overflow-hidden">
        <div className="p-4 sm:p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg sm:text-xl">Cancel Appointment</DialogTitle>
            <DialogDescription className="text-sm sm:text-base mt-2 pr-2">
              {(isWithin24Hours || hasNoShow)
                ? "This session is within 24 hours. Cancelling now will result in a 50% charge."
                : "Would you like to cancel or reschedule your appointment?"}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <p className="text-sm text-gray-700 mb-4 pr-2">
              {(isWithin24Hours || hasNoShow) ? "Would you like to:" : "Please select one of the following options:"}
            </p>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start border-red-200 hover:bg-red-50 hover:text-red-700 text-sm sm:text-base py-3 px-4 whitespace-normal h-auto"
                onClick={() => handleCancel(isWithin24Hours)}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 flex-shrink-0 animate-spin" /> : null}
                <span className="text-left pr-2">
                  {(isWithin24Hours || hasNoShow)
                    ? `Fully Cancel ${isSingleSession ? "(50% charge applies)" : "(50% charge applies)"}`
                    : "Fully Cancel the session (No charge)"}
                </span>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start border-blue-200 hover:bg-blue-50 hover:text-blue-700 text-sm sm:text-base py-3 px-4 whitespace-normal h-auto"
                onClick={() => {
                  onReschedule(appointmentId, (isWithin24Hours || hasNoShow))
                  onOpenChange(false)
                }}
                disabled={isSubmitting}
              >
                <span className="text-left pr-2">
                  Reschedule to another time
                  {(isWithin24Hours || hasNoShow) ? " (No extra charge but treated as a cancellation and new booking)" : ""}
                </span>
              </Button>
            </div>
          </div>

          <DialogFooter className="flex sm:justify-end justify-center mt-4">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
