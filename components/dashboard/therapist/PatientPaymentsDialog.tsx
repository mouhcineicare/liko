"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface Payment {
  id: string
  amount: number
  currency: string
  created: number // This is in seconds since epoch
  status: string
  payment_method: string
  receipt_url: string | null
}

interface PatientPaymentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientEmail: string
  patientName: string
}

export function PatientPaymentsDialog({
  open,
  onOpenChange,
  patientEmail,
  patientName,
}: PatientPaymentsDialogProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchPatientPayments()
    }
  }, [open])

  const fetchPatientPayments = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/patient/stripe?email=${patientEmail}&limit=100`)
      if (!response.ok) throw new Error("Failed to fetch payments")
      
      const data = await response.json()
      setPayments(data.payments)
    } catch (error) {
      console.error("Error fetching payments:", error)
      toast.error("Failed to load payment history")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Payment History</DialogTitle>
          <DialogDescription>
            Payment history for {patientName}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 max-h-[70vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading payments...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No payment history found
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-5 gap-2 font-medium text-sm pb-2 border-b">
                    <div>Date</div>
                    <div>Amount</div>
                    <div>Status</div>
                    <div>Method</div>
                    <div>Receipt</div>
                  </div>
                  {payments.map((payment) => (
                    <div key={payment.id} className="grid grid-cols-5 gap-2 text-sm items-center py-2 border-b">
                      <div>{format(payment.created, 'PPp')}</div>
                      <div>{(payment.amount).toFixed(2)} {payment.currency.toUpperCase()}</div>
                      <div className="capitalize">{payment.status}</div>
                      <div className="capitalize">{payment.payment_method_types?.join(', ') || payment.payment_method}</div>
                      <div>
                        {payment.receipt_url ? (
                          <a 
                            href={payment.receipt_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}