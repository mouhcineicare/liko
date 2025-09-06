"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus } from "lucide-react"
import AllAppointments from "@/components/dashboard/admin/AllAppointments"
import AddAppointmentDialog from "@/components/dashboard/admin/AddAppointmentDialog"
import { useMediaQuery } from "@/hooks/use-media-query"

const tabOptions = [
  { value: "all", label: "All" }
]

type Props = {
  isRefresh: boolean;
  setIsMatched: (v: boolean) => void;
}

export default function AdminAppointmentsPage({isRefresh, setIsMatched}: Props) {
  const [activeTab, setActiveTab] = useState("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")

  const handleAppointmentAdded = () => {
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Manage Appointments</h1>
        <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Appointment
        </Button>
      </div>

      <Card className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6 pt-6">
            <TabsList className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {tabOptions.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="text-sm">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="all" className="m-0">
              <AllAppointments isRefresh={isRefresh} setIsMatched={setIsMatched} />
            </TabsContent>
          </div>
        </Tabs>
      </Card>

      <AddAppointmentDialog open={showAddDialog} onOpenChange={setShowAddDialog} onSuccess={handleAppointmentAdded} />
    </div>
  )
}

