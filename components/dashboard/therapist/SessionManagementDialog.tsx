"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { format } from "date-fns"
import { Progress } from "@/components/ui/progress"

interface SessionManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: {
    _id: string
    date: string
    totalSessions?: number
    completedSessions?: number
    plan: string
    planType?: string
    patient: {
      fullName: string
    }
    sessions: Array<{
      payment?: string
    }>
  }
  onSuccess: () => void
  onSelectedSessionsChange?: (selectedSessions: any[]) => void // NEW: callback for selected session objects
}

export default function SessionManagementDialog({
  open,
  onOpenChange,
  appointment,
  onSuccess,
  onSelectedSessionsChange, // NEW
}: SessionManagementDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const totalSessions = appointment.totalSessions || 1
  const completedSessions = appointment.completedSessions || 0

  // Check if there's a fractional part (0.5)
  const hasHalfSession = totalSessions % 1 === 0.5
  // Get the whole number of sessions
  const wholeSessionsCount = Math.floor(totalSessions)
  // Total number of checkboxes (whole sessions + half session if applicable)
  const totalCheckboxes = hasHalfSession ? wholeSessionsCount + 1 : wholeSessionsCount

  // State to track which sessions are checked
  const [checkedSessions, setCheckedSessions] = useState<boolean[]>(Array(totalCheckboxes).fill(false))

  // Transform AppointmentSession to match the expected type
  const transformedSessions = appointment.sessions.map(session => ({
    ...session,
    payment: session.payment || "Pending" // Default payment status if missing
  }));

  // Initialize checked sessions based on completedSessions
  useEffect(() => {
    // Calculate how many full checkboxes should be checked
    const fullCheckedCount = Math.floor(completedSessions)
    // Check if the half session should be checked
    const halfSessionChecked = completedSessions % 1 === 0.5

    const initialCheckedSessions = Array(totalCheckboxes)
      .fill(false)
      .map((_, index) => {
        if (index < fullCheckedCount) {
          return true // Full sessions
        } else if (index === fullCheckedCount && halfSessionChecked) {
          return true // Half session if applicable
        }
        return false
      })

    setCheckedSessions(initialCheckedSessions)
  }, [completedSessions, totalCheckboxes])

  // Handle checkbox change
  const handleCheckboxChange = (index: number) => {
    const newCheckedSessions = [...checkedSessions]
    newCheckedSessions[index] = !newCheckedSessions[index]
    setCheckedSessions(newCheckedSessions)
  }

  // Calculate completed sessions value (including half session)
  const calculateCompletedSessionsValue = () => {
    let count = 0;

    checkedSessions.forEach((checked, index) => {
      if (checked) {
        // If it's the last checkbox and we have a half session
        if (hasHalfSession && index === completedSessions) {
          count += 0.5
        } else {
          count += 1
        }
      }
    })

    return count
  }

  // Handle save
  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const newCompletedSessions = calculateCompletedSessionsValue()

      const response = await fetch(`/api/appointments/${appointment._id}/sessions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completedSessions: newCompletedSessions,
          sessions: transformedSessions, // Include transformed sessions
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update sessions")
      }

      toast.success("Sessions updated successfully")
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error updating sessions:", error)
      toast.error(error.message || "Failed to update sessions")
    } finally {
      setIsSubmitting(false)
    }
  }

  const sessionProgress = (calculateCompletedSessionsValue() / totalSessions) * 100

  const getSessionsLabel = () => {
    if(totalSessions===1) return "1 Sessions";
    return totalSessions + 'Sessions';
  }

  // Get the label for a session (either a number or "1/2" for half session)
  const getSessionLabel = (index: number) => {
    if (hasHalfSession && index === completedSessions) {
      return "1/2"
    }
    return (index + 1).toString()
  }

  // Determine if a checkbox should be disabled
  const isCheckboxDisabled = (index: number) => {
    const currentCompletedWhole = Math.floor(completedSessions)
    const hasCompletedHalf = completedSessions % 1 === 0.5

    // Already completed sessions from API can't be unchecked
    if (index < currentCompletedWhole || (index === currentCompletedWhole && hasCompletedHalf)) {
      return true
    }

    // Only allow checking the next session in sequence
    const nextSessionIndex = hasCompletedHalf ? currentCompletedWhole + 1 : currentCompletedWhole
    return index !== nextSessionIndex && completedSessions < totalSessions
  }

  // NEW: Collect selected session objects
  useEffect(() => {
    if (onSelectedSessionsChange) {
      // Map checkedSessions to session objects
      const selectedSessions = appointment.sessions
        .map((session, idx) => checkedSessions[idx] ? { ...session, index: idx } : null)
        .filter(Boolean);
      onSelectedSessionsChange(selectedSessions);
    }
  }, [checkedSessions, appointment.sessions, onSelectedSessionsChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle>Manage Sessions</DialogTitle>
          <DialogDescription>
            {appointment.patient.fullName}&apos;s {appointment.plan} - {getSessionsLabel()}
            <br />
            <span className="text-sm text-gray-500">Scheduled for {format(new Date(appointment.date), "PPp")}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>
                  {calculateCompletedSessionsValue()} of {totalSessions} sessions completed
                </span>
                <span>{Math.round(sessionProgress)}%</span>
              </div>
              <Progress value={sessionProgress} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: totalCheckboxes }, (_, i) => i).map((index) => (
                <div key={index} className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg">
                  <Checkbox
                    id={`session-${index}`}
                    checked={checkedSessions[index]}
                    onCheckedChange={() => handleCheckboxChange(index)}
                    disabled={isCheckboxDisabled(index)}
                    className="h-5 w-5 border-2 border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <label
                    htmlFor={`session-${index}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Session {getSessionLabel(index)}
                  </label>
                </div>
              ))}
            </div>

            {calculateCompletedSessionsValue() >= totalSessions && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Marking all sessions as completed will automatically complete this appointment.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || calculateCompletedSessionsValue() >= totalSessions}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isSubmitting ? "Updating..." : "Update Sessions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

