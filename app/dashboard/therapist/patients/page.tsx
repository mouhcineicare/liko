"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Search, Calendar, CreditCard } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import {PatientAppointmentsDialog} from "@/components/dashboard/therapist/PatientAppointmentsDialog"
import { PatientPaymentsDialog } from "@/components/dashboard/therapist/PatientPaymentsDialog"

interface Patient {
  _id: string
  fullName: string
  email: string
  telephone: string
  lastAppointment?: string
  nextAppointment?: string
  totalSessions: number
}

export default function PatientsPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [isPaymentsDialogOpen, setIsPaymentsDialogOpen] = useState(false)


  useEffect(() => {
    fetchPatients()
  }, [])

  const fetchPatients = async () => {
    try {
      const response = await fetch("/api/therapist/patients")
      if (!response.ok) {
        throw new Error("Failed to fetch patients")
      }
      const data = await response.json()
      setPatients(data)
    } catch (error) {
      console.error("Error fetching patients:", error)
      toast.error("Failed to load patients")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredPatients = patients.filter(
    (patient) =>
      patient.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Skeleton loaders
  const renderStatCardSkeleton = () => (
    <Card className="p-4 bg-white border-gray-200">
      <Skeleton className="h-4 w-28 mb-1" />
      <Skeleton className="h-8 w-16 mt-1" />
    </Card>
  )

  const renderTableRowSkeleton = () => (
    <TableRow>
      <TableCell>
        <Skeleton className="h-5 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-40" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-28" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-12" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-9 w-36" />
      </TableCell>
    </TableRow>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Patients</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            {renderStatCardSkeleton()}
            {renderStatCardSkeleton()}
            {renderStatCardSkeleton()}
          </>
        ) : (
          <>
            <Card className="p-4 bg-white border-gray-200">
              <div className="text-sm font-medium text-gray-900">Total Patients</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">{patients.length}</div>
            </Card>
            <Card className="p-4 bg-white border-gray-200">
              <div className="text-sm font-medium text-gray-900">Active Patients</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">
                {patients.filter((p) => p.nextAppointment).length}
              </div>
            </Card>
            <Card className="p-4 bg-white border-gray-200">
              <div className="text-sm font-medium text-gray-900">Total Sessions</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">
                {patients.reduce((sum, p) => sum + (p.totalSessions || 0), 0)}
              </div>
            </Card>
          </>
        )}
      </div>

      <Card className="p-6 bg-white border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search patients..."
              className="pl-8 bg-white text-gray-900 border-gray-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="rounded-md border border-gray-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-gray-900">Patient Name</TableHead>
                <TableHead className="text-gray-900">Email</TableHead>
                <TableHead className="text-gray-900">Phone</TableHead>
                <TableHead className="text-gray-900">Total Sessions</TableHead>
                <TableHead className="text-gray-900">Last Visit</TableHead>
                <TableHead className="text-gray-900">Next Appointment</TableHead>
                <TableHead className="text-gray-900">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Skeleton rows
                <>{[...Array(5)].map((_, index) => renderTableRowSkeleton())}</>
              ) : filteredPatients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                    {searchTerm ? "No patients found matching your search" : "No patients found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPatients.map((patient) => (
                  <TableRow key={patient._id}>
                    <TableCell className="font-medium text-gray-900">{patient.fullName}</TableCell>
                    <TableCell className="text-gray-900">{patient.email}</TableCell>
                    <TableCell className="text-gray-900">{patient.telephone}</TableCell>
                    <TableCell className="text-gray-900">{patient.totalSessions || 0}</TableCell>
                    <TableCell className="text-gray-900">
                      {patient.lastAppointment ? new Date(patient.lastAppointment).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell className="text-gray-900">
                      {patient.nextAppointment ? new Date(patient.nextAppointment).toLocaleDateString() : "None"}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white hover:text-black text-black border-gray-200 hover:bg-gray-100"
                          onClick={() => {
                            setSelectedPatient(patient)
                            setIsAppointmentDialogOpen(true)
                          }}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          View Appointments
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white hover:text-black text-black border-gray-200 hover:bg-gray-100"
                          onClick={() => {
                            setSelectedPatient(patient)
                            setIsPaymentsDialogOpen(true)
                          }}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          View Payments
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {selectedPatient && (
         <>
          <PatientAppointmentsDialog
            open={isAppointmentDialogOpen}
            onOpenChange={setIsAppointmentDialogOpen}
            patientId={selectedPatient._id}
            patientName={selectedPatient.fullName}
          />
          <PatientPaymentsDialog
            open={isPaymentsDialogOpen}
            onOpenChange={setIsPaymentsDialogOpen}
            patientEmail={selectedPatient.email}
            patientName={selectedPatient.fullName}
          />
        </>
      )}
    </div>
  )
}

