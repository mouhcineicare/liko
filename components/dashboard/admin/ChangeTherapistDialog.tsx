"use client"

import { useState, useEffect } from "react"
import { 
  Modal, 
  Button, 
  Input, 
  Avatar, 
  List, 
  Tag, 
  Divider, 
  Spin, 
  message,
  Card,
  Badge,
  Space
} from 'antd'
import { 
  SearchOutlined,
  UserOutlined,
  CheckOutlined,
  CloseOutlined,
  LoadingOutlined
} from '@ant-design/icons'

interface Patient {
  _id: string
  fullName: string
  email?: string
  therapy?: string
}

interface Therapist {
  _id: string
  therapistId: string
  fullName: string
  email: string
  image?: string
  specialties?: string[]
  completedSessions?: number
  level?: number
  weeklyPatientsLimit?: number
  remainingWeeklySessions?: number
  isCalendarConnected?: boolean
}

interface ChangeTherapistDialogProps {
  patient: Patient
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function ChangeTherapistDialog({ 
  patient, 
  open, 
  onOpenChange, 
  onSuccess 
}: ChangeTherapistDialogProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null)
  const [currentTherapist, setCurrentTherapist] = useState<Therapist | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)

  useEffect(() => {
    if (open) {
      fetchTherapists()
      if (patient.therapy) {
        fetchCurrentTherapist(patient.therapy)
      }
    } else {
      setSearchTerm("")
      setTherapists([])
      setSelectedTherapist(null)
      setPage(1)
      setCurrentTherapist(null)
    }
  }, [open, patient])

  useEffect(() => {
    if (searchTerm) {
      const timer = setTimeout(() => {
        searchTherapists(1)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [searchTerm])

  const fetchTherapists = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/therapists/list?page=1&limit=10`)
      if (!response.ok) throw new Error("Failed to fetch therapists")

      const data = await response.json()
      setTherapists(data.therapists)
      setHasMore(data.pagination.hasNextPage)
      setPage(1)
    } catch (error) {
      console.error("Error fetching therapists:", error)
      message.error("Failed to load therapists")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCurrentTherapist = async (therapistId: string) => {
    try {
      const response = await fetch(`/api/admin/therapists/${therapistId}`)
      if (!response.ok) throw new Error("Failed to fetch current therapist")

      const data = await response.json()
      setCurrentTherapist(data)
    } catch (error) {
      console.error("Error fetching current therapist:", error)
    }
  }

  const searchTherapists = async (pageNum: number) => {
    setIsSearching(true)
    try {
      const response = await fetch(
        `/api/admin/therapists/list?page=${pageNum}&limit=10&search=${encodeURIComponent(searchTerm)}`,
      )
      if (!response.ok) throw new Error("Failed to search therapists")

      const data = await response.json()

      if (pageNum === 1) {
        setTherapists(data.therapists)
      } else {
        setTherapists((prev) => [...prev, ...data.therapists])
      }

      setHasMore(data.pagination.hasNextPage)
      setPage(pageNum)
    } catch (error) {
      console.error("Error searching therapists:", error)
      message.error("Failed to search therapists")
    } finally {
      setIsSearching(false)
    }
  }

  const loadMoreTherapists = () => {
    if (hasMore && !isSearching) {
      if (searchTerm) {
        searchTherapists(page + 1)
      } else {
        fetchMoreTherapists(page + 1)
      }
    }
  }

  const fetchMoreTherapists = async (pageNum: number) => {
    setIsSearching(true)
    try {
      const response = await fetch(`/api/admin/therapists/list?page=${pageNum}&limit=10`)
      if (!response.ok) throw new Error("Failed to fetch more therapists")

      const data = await response.json()
      setTherapists((prev) => [...prev, ...data.therapists])
      setHasMore(data.pagination.hasNextPage)
      setPage(pageNum)
    } catch (error) {
      console.error("Error fetching more therapists:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectTherapist = (therapist: Therapist) => {
    if (currentTherapist && therapist._id === currentTherapist.therapistId) {
      return
    }
    setSelectedTherapist(therapist)
  }

  const handleAssignTherapist = async () => {
    if (!selectedTherapist) {
      message.error("Please select a therapist")
      return
    }

    if (currentTherapist && selectedTherapist._id === currentTherapist.therapistId) {
      message.error("This therapist is already assigned to the patient")
      return
    }

    setIsAssigning(true)
    try {
      const response = await fetch(`/api/admin/users/patients/${patient._id}/assign-therapist`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          therapistId: selectedTherapist._id,
        }),
      })

      if (!response.ok) throw new Error("Failed to assign therapist")

      message.success(`Therapist ${selectedTherapist.fullName} assigned to ${patient.fullName}`)
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error assigning therapist:", error)
      message.error("Failed to assign therapist")
    } finally {
      setIsAssigning(false)
    }
  }

  return (
    <Modal
      title={`Change Therapist for ${patient.fullName}`}
      open={open}
      onCancel={() => onOpenChange(false)}
      width={800}
      footer={[
        <Button key="back" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          onClick={handleAssignTherapist}
          loading={isAssigning}
          disabled={!selectedTherapist}
          icon={selectedTherapist ? <CheckOutlined /> : null}
        >
          Assign Therapist
        </Button>,
      ]}
    >
      {/* Current Therapist Section */}
      {currentTherapist && (
        <Card 
          title="Current Therapist" 
          bordered={false}
          className="mb-4 bg-blue-50 border-blue-200"
        >
          <div className="flex items-center gap-3">
            <Avatar 
              src={currentTherapist.image} 
              icon={<UserOutlined />}
              className="border border-blue-300"
            />
            <div>
              <h4 className="font-medium">Dr. {currentTherapist.fullName}</h4>
              <p className="text-gray-600">{currentTherapist.email}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Search Section */}
      <Input
        placeholder="Search therapists by name or specialties..."
        prefix={<SearchOutlined />}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4"
      />

      {/* Therapists List */}
      <div className="mb-2">
        <h4 className="font-medium">Select a Therapist</h4>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
        </div>
      ) : therapists.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? "No therapists found matching your search" : "No therapists available"}
        </div>
      ) : (
        <div className="max-h-[400px] overflow-y-auto pr-2">
          <List
            dataSource={therapists}
            renderItem={(therapist) => {
              const isCurrentTherapist = currentTherapist && therapist._id === currentTherapist.therapistId
              const isSelected = selectedTherapist?._id === therapist._id
              
              return (
                <List.Item
                  onClick={() => handleSelectTherapist(therapist)}
                  className={`p-4 border rounded-lg mb-2 cursor-pointer transition-colors ${
                    isCurrentTherapist
                      ? "border-red-300 bg-red-50 opacity-80 cursor-not-allowed"
                      : isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start w-full">
                    <Avatar 
                      src={therapist.image} 
                      icon={<UserOutlined />}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">Dr. {therapist.fullName} 
                <Tag color={therapist.isCalendarConnected ? 'green' : 'red'} className="ml-2">
                  {therapist.isCalendarConnected ? 'Calendar Connected' : 'Calendar Not Connected'}
                </Tag>
              </h4>
              <p className="text-gray-600 text-sm">{therapist.email}</p>
                        </div>
                        <div>
                          {isCurrentTherapist ? (
                            <Badge 
                              count="Current Therapist" 
                              style={{ backgroundColor: '#ff4d4f', borderColor: '#ff4d4f' }} 
                            />
                          ) : (
                            isSelected && <CheckOutlined className="text-blue-600 text-lg" />
                          )}
                        </div>
                      </div>

                      <div className="mt-2">
                        <Space size={[0, 8]} wrap>
                          {therapist.specialties?.map((specialty, index) => (
                            <Tag 
                              key={index} 
                              color={isCurrentTherapist ? "red" : "blue"}
                            >
                              {specialty}
                            </Tag>
                          ))}
                        </Space>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-600">
                        <span>Level: {therapist.level}</span>
                        <span>Completed Sessions: {therapist.completedSessions}</span>
                        <span>
                          Goal: {therapist.weeklyPatientsLimit} sessions/week
                        </span>
                      </div>

                      {isCurrentTherapist && (
                        <p className="mt-2 text-xs text-red-600 italic">Already assigned to this patient</p>
                      )}
                    </div>
                  </div>
                </List.Item>
              )
            }}
          />

          {hasMore && (
            <div className="text-center py-2">
              <Button 
                onClick={loadMoreTherapists} 
                loading={isSearching}
                type="dashed"
              >
                {isSearching ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}