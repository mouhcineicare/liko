"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { toast } from "sonner"

interface DeclineCommentPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  comment?: string
  onSuccess?: () => void
}

export default function DeclineCommentPopup({
  open,
  onOpenChange,
  comment = "",
  onSuccess,
}: DeclineCommentPopupProps) {
  const [declineComment, setDeclineComment] = useState(comment)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!declineComment.trim()) {
      toast.error("Please provide a reason for declining")
      return
    }

    setIsSubmitting(true)
    try {
      // In a real implementation, you would call your API here
      // await updateAppointmentStatus(selectedAppointmentId, "rejected", declineComment)
      toast.success("Appointment declined successfully")
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Error declining appointment:", error)
      toast.error("Failed to decline appointment")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Decline Appointment</DialogTitle>
          <DialogDescription>
            Please provide a reason for declining this appointment. This will be visible to the patient.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="declineComment">Reason for Declining</Label>
            <Textarea
              id="declineComment"
              value={declineComment}
              onChange={(e) => setDeclineComment(e.target.value)}
              placeholder="Please explain why you are declining this appointment..."
              className="min-h-[100px]"
              disabled={isSubmitting}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Declining..." : "Decline Appointment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}