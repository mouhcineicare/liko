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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Copy, Check } from "lucide-react"

interface Plan {
  _id: string
  title: string
  price: number
  description: string
  features: string[]
  therapyType: string
  type: string
}

interface CreateAppointmentPlanLinkProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CreateAppointmentPlanLink({
  open,
  onOpenChange,
}: CreateAppointmentPlanLinkProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [copied, setCopied] = useState(false)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''

  useEffect(() => {
    if (open) {
      fetchPlans()
    }
  }, [open])

  const fetchPlans = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/plans")
      if (!response.ok) throw new Error("Failed to fetch plans")

      const data = await response.json()
      setPlans(data)
    } catch (error) {
      console.error("Error fetching plans:", error)
      toast.error("Failed to load plans")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan)
    setCopied(false)
  }

  const handleCopyLink = () => {
    if (!selectedPlan) return
    
    const url = `${baseUrl}/dashboard/patient?planId=${selectedPlan._id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success("Link copied to clipboard!")
    
    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Share Therapy Plan</DialogTitle>
          <DialogDescription>
            Select a plan to generate a shareable link for patients
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading plans...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Plan Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
              {plans.map((plan) => (
                <Card
                  key={plan._id}
                  className={`p-6 cursor-pointer transition-all ${
                    selectedPlan?._id === plan._id
                      ? "ring-2 ring-blue-500 border-blue-500"
                      : "hover:border-blue-300"
                  }`}
                  onClick={() => handlePlanSelect(plan)}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold">{plan.title}</h3>
                      <div className="text-lg font-bold">د.إ{plan.price}</div>
                    </div>
                    <p className="text-sm text-gray-600">{plan.description}</p>
                    <ul className="space-y-2 mt-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start text-sm">
                          <span className="text-blue-500 mr-2">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {plan.therapyType}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {plan.type}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Link Generation */}
            {selectedPlan && (
              <div className="mt-4 space-y-2">
                <Label>Shareable Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={`${baseUrl}/dashboard/patient?planId=${selectedPlan._id}`}
                    readOnly
                    className="flex-1"
                  />
                  <Button onClick={handleCopyLink}>
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Patients who click this link will be directed to book this specific plan.
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}