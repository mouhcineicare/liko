"use client"

import { Spin } from "antd"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useEffect, useState } from "react"

interface Patient {
  _id: string
  fullName: string
  email: string
  image?: string
}

interface ViewPatientsDialogProps {
  therapistId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ViewPatientsDialog({ therapistId, open, onOpenChange }: ViewPatientsDialogProps) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (open && therapistId) {
      fetchPatients()
    }
  }, [open, therapistId])

  const fetchPatients = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/therapists/${therapistId}/patients/list`)
      if (!response.ok) throw new Error("Failed to fetch patients")
      const data = await response.json()
      setPatients(data.patients)
    } catch (error) {
      console.error("Error fetching patients:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Patients List</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px]">
          <Spin spinning={isLoading} tip="Loading patients..." size="large">
            {patients.length === 0 && !isLoading ? (
              <div className="text-center py-4 text-gray-500">No patients found</div>
            ) : (
              <div className="space-y-4">
                {patients.map((patient) => (
                  <div key={patient._id} className="flex items-center gap-4 p-2 hover:bg-gray-50 rounded">
                    <Avatar>
                      <AvatarImage src={patient.image} />
                      <AvatarFallback>
                        {getInitials(patient.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{patient.fullName}</div>
                      <div className="text-sm text-gray-500">{patient.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Spin>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}