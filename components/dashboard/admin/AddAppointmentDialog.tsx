"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  Modal, 
  Input, 
  Button, 
  Select, 
  DatePicker, 
  Space, 
  Form, 
  Tag, 
  Avatar, 
  Spin,
  TimePicker,
  message
} from 'antd'
import dayjs from 'dayjs';
import { 
  SearchOutlined,
  PlusOutlined,
  DeleteOutlined,
  UserOutlined,
  CalendarOutlined
} from '@ant-design/icons'
import { format, addDays } from "date-fns"
const { Option } = Select
const { TextArea } = Input

interface AddAppointmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface Patient {
  _id: string
  fullName: string
  email?: string
  telephone?: string
  image?: string
}

interface Therapist {
  _id: string
  fullName: string
}

interface Plan {
  _id: string
  title: string
  price: number
  type: string
  therapyType: string
}

interface Session {
  date: string
  time: string
}

const THERAPY_TYPES = [
  { id: "individual", label: "Individual Therapy" },
  { id: "couples", label: "Couples Therapy" },
  { id: "kids", label: "Kids Therapy" },
  { id: "psychiatry", label: "Psychiatry" },
]

export default function AddAppointmentDialog({ open, onOpenChange, onSuccess }: AddAppointmentDialogProps) {
  const [form] = Form.useForm()
  const [isLoading, setIsLoading] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientSearchTerm, setPatientSearchTerm] = useState("")
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPatient, setSelectedPatient] = useState("")
  const [selectedTherapist, setSelectedTherapist] = useState("")
  const [selectedPlan, setSelectedPlan] = useState("")
  const [selectedTherapyType, setSelectedTherapyType] = useState("")
  const [status, setStatus] = useState("pending_approval")
  const [sessions, setSessions] = useState<Session[]>([])
  const [meetingLink, setMeetingLink] = useState("")
  const [isSearchingPatients, setIsSearchingPatients] = useState(false)

  const searchPatients = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      fetchData()
      return
    }
  
    setIsSearchingPatients(true)
    try {
      const response = await fetch(
        `/api/admin/users/patients?search=${encodeURIComponent(searchTerm)}&skipPagination=true`
      )
      if (!response.ok) throw new Error("Failed to search patients")
      const data = await response.json()
      setPatients(data.patients || [])
    } catch (error) {
      console.error("Error searching patients:", error)
      message.error("Failed to search patients")
    } finally {
      setIsSearchingPatients(false)
    }
  }

  const filteredPatients = useMemo(() => {
    if (!patientSearchTerm.trim()) return patients
    
    const searchTerm = patientSearchTerm.toLowerCase()
    return patients.filter(patient => 
      patient.fullName.toLowerCase().includes(searchTerm) ||
      (patient.email && patient.email.toLowerCase().includes(searchTerm)) ||
      (patient.telephone && patient.telephone.includes(patientSearchTerm))
    )
  }, [patientSearchTerm, patients])

  const filteredPlans = useMemo(() => {
    if (!selectedTherapyType) return plans
    return plans.filter(plan => plan.therapyType === selectedTherapyType)
  }, [plans, selectedTherapyType])

  useEffect(() => {
    if (open) {
      fetchData()
      setSessions([{
        date: new Date().toISOString(),
        time: "12:00"
      }])
    }
  }, [open])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [patientsRes, therapistsRes, plansRes] = await Promise.all([
        fetch(`/api/admin/users/patients?skipPagination=true&limit=50`),
        fetch("/api/admin/therapists"),
        fetch("/api/plans"),
      ])

      if (!patientsRes.ok) throw new Error("Failed to fetch patients")
      if (!therapistsRes.ok) throw new Error("Failed to fetch therapists")
      if (!plansRes.ok) throw new Error("Failed to fetch plans")

      const patientsData = await patientsRes.json()
      const therapistsData = await therapistsRes.json()
      const plansData = await plansRes.json()

      setPatients(patientsData.patients || [])
      setTherapists(therapistsData || [])
      setPlans(plansData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      message.error("Failed to load required data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSessionDateChange = (index: number, date: Date | undefined) => {
    if (!date) return
    
    const newSessions = [...sessions]
    newSessions[index].date = date.toISOString()
    setSessions(newSessions)
  }

  const handleSessionTimeChange = (index: number, time: dayjs.Dayjs | null, timeString: string | string[]) => {
    if (!timeString) return;
    
    const timeStr = Array.isArray(timeString) ? timeString[0] : timeString;
    
    const newSessions = [...sessions];
    newSessions[index].time = timeStr;
    setSessions(newSessions);
  }

  const addSession = () => {
    const lastSession = sessions[sessions.length - 1]
    const lastDate = lastSession ? new Date(lastSession.date) : new Date()
    const newDate = addDays(lastDate, 7)
    
    setSessions([
      ...sessions,
      {
        date: newDate.toISOString(),
        time: "12:00"
      }
    ])
  }

  const removeSession = (index: number) => {
    if (sessions.length <= 1) {
      message.error("At least one session is required")
      return
    }
    
    const newSessions = [...sessions]
    newSessions.splice(index, 1)
    setSessions(newSessions)
  }

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId)
    const plan = plans.find((p) => p._id === planId)
    if (plan) {
      setSelectedTherapyType(plan.therapyType)
    }
  }

  const handleSubmit = async () => {
    try {
      setIsLoading(true)

      if (!selectedPatient || !selectedPlan || !selectedTherapyType || sessions.length === 0) {
        throw new Error("Please fill all required fields")
      }

      const invalidSession = sessions.find(s => !s.date || !s.time)
      if (invalidSession) {
        throw new Error("Please fill all session dates and times")
      }

      const sessionDates = sessions.map(session => {
        const [hours, minutes] = session.time.split(":").map(Number)
        const date = new Date(session.date)
        date.setHours(hours, minutes, 0, 0)
        return date.toISOString()
      })

      const selectedPlanData = plans.find((p) => p._id === selectedPlan)
      if (!selectedPlanData) {
        throw new Error("Selected plan not found")
      }

      const response = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient: selectedPatient,
          therapist: selectedTherapist,
          sessions: sessionDates,
          plan: selectedPlanData.title,
          price: selectedPlanData.price,
          therapyType: selectedTherapyType,
          status,
          paymentStatus: "completed",
          meetingLink,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create appointment")
      }

      message.success("Appointment created successfully")
      onSuccess()
      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      console.error("Error creating appointment:", error)
      message.error(error.message || "Failed to create appointment")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedPatient("")
    setSelectedTherapist("")
    setSelectedPlan("")
    setSelectedTherapyType("")
    setStatus("pending_approval")
    setPatientSearchTerm("")
    setSessions([{
      date: new Date().toISOString(),
      time: "12:00"
    }])
    setMeetingLink("")
  }

  return (
    <Modal
      title="Add New Appointment"
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
          loading={isLoading}
          onClick={handleSubmit}
        >
          Create Appointment
        </Button>,
      ]}
    >
      <Spin spinning={isLoading && patients.length === 0}>
        <Form layout="vertical">
        <Form.Item label="Select Patient" required>
  <Select
    showSearch
    placeholder="Search patient by name, email or phone"
    optionFilterProp="children"
    onSearch={searchPatients}
    filterOption={false}
    loading={isSearchingPatients}
    value={selectedPatient}
    onChange={setSelectedPatient}
    notFoundContent={isSearchingPatients ? <Spin size="small" /> : "No patients found"}
    labelInValue={false}
  >
    {filteredPatients.map(patient => (
      <Option key={patient._id} value={patient._id}>
        <Space>
          <Avatar 
            size="small" 
            icon={<UserOutlined />} 
            src={patient.image || undefined}
          />
          <div>
            <div>{patient.fullName}</div>
            {patient.email && (
              <div style={{ fontSize: 12, color: '#888' }}>{patient.email}</div>
            )}
            {patient.telephone && (
              <div style={{ fontSize: 12, color: '#888' }}>{patient.telephone}</div>
            )}
          </div>
        </Space>
      </Option>
    ))}
  </Select>
        </Form.Item>

          <Form.Item label="Select Therapist">
  <Select
    value={selectedTherapist}
    onChange={setSelectedTherapist}
    placeholder="Select a therapist"
    allowClear
  >
    {therapists.map(therapist => (
      <Option key={therapist._id} value={therapist._id}>
        Dr. {therapist.fullName}
      </Option>
    ))}
  </Select>
          </Form.Item>

          <Form.Item label="Therapy Type" required>
  <Select
    value={selectedTherapyType}
    onChange={setSelectedTherapyType}
    placeholder="Select therapy type"
    allowClear
  >
    {THERAPY_TYPES.map(type => (
      <Option key={type.id} value={type.id}>{type.label}</Option>
    ))}
  </Select>
          </Form.Item>

          <Form.Item label="Select Plan" required>
  <Select
    value={selectedPlan}
    onChange={handleSelectPlan}
    placeholder="Select a treatment plan"
    allowClear
  >
    {filteredPlans.map(plan => (
      <Option key={plan._id} value={plan._id}>
        {plan.title} - د.إ{plan.price} ({plan.therapyType})
      </Option>
    ))}
  </Select>
          </Form.Item> 

          <Form.Item label={`Sessions (${sessions.length})`} required>
            <Space direction="vertical" style={{ width: '100%' }}>
              {sessions.map((session, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  gap: 16,
                  alignItems: 'flex-end',
                  padding: 16,
                  border: '1px solid #f0f0f0',
                  borderRadius: 8
                }}>
                  <Form.Item label="Date" style={{ flex: 1 }}>
                    <DatePicker
                      value={session.date ? dayjs(session.date) : null}  // Using dayjs here
                      onChange={(date) => handleSessionDateChange(index, date?.toDate())}
                      style={{ width: '100%' }}
                      suffixIcon={<CalendarOutlined />}
                    />
                  </Form.Item>

                  <Form.Item label="Time" style={{ flex: 1 }}>
                    <TimePicker
                      format="HH:mm"
                      value={session.time ? dayjs(`1970-01-01T${session.time}`) : null}
                      onChange={(time, timeString) => handleSessionTimeChange(index, time, timeString)}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>

                  {index > 0 && (
                    <Button
                      icon={<DeleteOutlined />}
                      danger
                      onClick={() => removeSession(index)}
                      style={{ marginBottom: 24 }}
                    />
                  )}
                </div>
              ))}

              <Button 
                icon={<PlusOutlined />}
                onClick={addSession}
                type="dashed"
                block
              >
                Add Session
              </Button>
            </Space>
          </Form.Item>
  
          <Form.Item label="Meeting Link">
            <Input
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/..."
            />
          </Form.Item>

          <Form.Item label="Status">
  <Select
    value={status}
    onChange={setStatus}
    placeholder="Select appointment status"
    allowClear
  >
    <Option value="pending_approval">Pending Approval</Option>
    <Option value="pending">Pending</Option>
    <Option value="approved">Approved</Option>
    <Option value="in_progress">In Progress</Option>
    <Option value="completed">Completed</Option>
  </Select>
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  )
}