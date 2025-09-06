"use client"

import { useState, useEffect } from "react"
import { 
  Modal, 
  Button, 
  Input, 
  Select, 
  DatePicker, 
  TimePicker, 
  Card, 
  Tag, 
  Spin,
  message,
  Divider,
  Typography,
  Space,
  Alert,
  Switch
} from "antd"
import dayjs, { Dayjs } from "dayjs"
import { 
  UserOutlined,
  DollarOutlined,
  CalendarOutlined,
  LoadingOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined
} from "@ant-design/icons"

const { Option } = Select
const { Text } = Typography

interface Patient {
  _id: string
  fullName: string
  email: string
  telephone?: string
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
  _id?: string
  date: string
  status: string
  payment: string
}

interface Appointment {
  _id: string
  patient: Patient
  therapist?: Therapist
  date: string
  status: string
  paymentStatus: string
  plan: string
  planType: string
  price: number
  meetingLink?: string
  recurring: Session[]
  sessionsHistory: string[]
  completedSessions: number
  patientTimezone?: string
  isBalance: boolean | null
}

export default function EditAppointmentDialog({
  appointmentId,
  open,
  onOpenChange,
  onSuccess,
}: {
  appointmentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])

  // Form state
  const [recurringSessions, setRecurringSessions] = useState<Session[]>([])
  const [status, setStatus] = useState("")
  const [paymentStatus, setPaymentStatus] = useState("")
  const [selectedPlan, setSelectedPlan] = useState("")
  const [price, setPrice] = useState(0)
  const [meetingLink, setMeetingLink] = useState("")
  const [patientTimezone, setPatientTimezone] = useState("")
  const [isBalance, setIsBalance] = useState<boolean | null>(null)
  const [mainAppointmentDate, setMainAppointmentDate] = useState<Dayjs | null>(null)


  // Fetch appointment data when dialog opens
  useEffect(() => {
    if (open && appointmentId) {
      fetchAppointment()
      fetchPlans()
    }
  }, [open, appointmentId])

  const fetchAppointment = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}`)
      if (!response.ok) throw new Error("Failed to fetch appointment")

      const data = await response.json()
      setAppointment(data)
      setIsBalance(data.isBalance)
      setMainAppointmentDate(dayjs(data.date))

      // Only set recurring sessions (excluding the main appointment session)
      setRecurringSessions(data.recurring || [])

      // Set other form fields
      setStatus(data.status)
      setPaymentStatus(data.paymentStatus)
      setSelectedPlan(data.plan)
      setPrice(data.price)
      setMeetingLink(data.meetingLink || "")
      setPatientTimezone(data.patientTimezone || "")
    } catch (error) {
      console.error("Error fetching appointment:", error)
      message.error("Failed to load appointment details")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/admin/plans")
      if (!response.ok) throw new Error("Failed to fetch plans")

      const data = await response.json()
      setPlans(data)
    } catch (error) {
      console.error("Error fetching plans:", error)
      message.error("Failed to load plans")
    }
  }

  const addRecurringSession = () => {
    const lastSession = recurringSessions[recurringSessions.length - 1]
    const lastDate = lastSession ? dayjs(lastSession.date) : dayjs()
    const newDate = lastDate.add(7, 'day').toISOString()
    
    setRecurringSessions([
      ...recurringSessions,
      {
        date: newDate,
        status: 'in_progress',
        payment: 'not_paid'
      }
    ])
  }

  const removeRecurringSession = (index: number) => {
    const newSessions = [...recurringSessions]
    newSessions.splice(index, 1)
    setRecurringSessions(newSessions)
  }

  const updateRecurringSession = (index: number, field: string, value: any) => {
    const newSessions = [...recurringSessions]
    newSessions[index] = {
      ...newSessions[index],
      [field]: value
    }
    setRecurringSessions(newSessions)
  }

  const handleSave = async () => {
    // Validate form
    if (!appointment?.patient) {
      message.error("Patient information is missing")
      return
    }

    if (!status) {
      message.error("Please select an appointment status")
      return
    }

    if (!paymentStatus) {
      message.error("Please select a payment status")
      return
    }

    if (!selectedPlan) {
      message.error("Please select a plan")
      return
    }

    if (price <= 0) {
      message.error("Please enter a valid price")
      return
    }

    if(!mainAppointmentDate){
      message.error("Please select a main appointment date")
      return
    }

    setIsSaving(true)
    try {
      // Prepare the data in exact format backend expects
      const requestData = {
        status,
        date: mainAppointmentDate.toISOString(), 
        paymentStatus,
        patient: appointment.patient._id,
        plan: selectedPlan,
        price,
        meetingLink,
        therapist: appointment.therapist?._id || null,
        isBalance,
        // Include main appointment as first session
        sessions: [
          {
            date: appointment.date, // Main appointment date
            status: status, // Use current status
            payment: paymentStatus // Use current payment status
          },
          ...recurringSessions // Include all recurring sessions
        ],
        // Also send recurring separately as your backend expects
        recurring: recurringSessions
      }

      const response = await fetch(`/api/admin/appointments/${appointmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update appointment")
      }

      message.success("Appointment updated successfully")
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error updating appointment:", error)
      message.error(error.message || "Failed to update appointment")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      title="Edit Appointment"
      open={open}
      onCancel={() => onOpenChange(false)}
      width={800}
      footer={[
        <Button key="cancel" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>,
        <Button 
          key="save" 
          type="primary" 
          onClick={handleSave}
          loading={isSaving}
        >
          Save Changes
        </Button>,
      ]}
    >
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
          <Spin />
        </div>
      ) : (
        <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
          {/* Patient Info */}
          <Card title="Patient Information" size="small" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Name: </Text>
                <Text>{appointment?.patient.fullName}</Text>
              </div>
              <div>
                <Text strong>Email: </Text>
                <Text>{appointment?.patient.email}</Text>
              </div>
              {appointment?.patient.telephone && (
                <div>
                  <Text strong>Phone: </Text>
                  <Text>{appointment.patient.telephone}</Text>
                </div>
              )}
            </Space>
          </Card>

          {/* Appointment Details */}
          <Card title="Appointment Details" size="small" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Status</Text>
                <Select
                  style={{ width: '100%' }}
                  value={status}
                  onChange={setStatus}
                >
                  <Option value="unpaid">Unpaid</Option>
                  <Option value="pending">Pending</Option>
                  <Option value="pending_approval">Pending Approval</Option>
                  <Option value="approved">Approved</Option>
                  <Option value="rejected">Rejected</Option>
                  <Option value="cancelled">Cancelled</Option>
                  <Option value="completed">Completed</Option>
                  <Option value="in_progress">In Progress</Option>
                  <Option value="no-show">No Show</Option>
                  <Option value="rescheduled">Rescheduled</Option>
                </Select>
              </div>

              <div>
                <Text strong>Payment Status</Text>
                <Select
                  style={{ width: '100%' }}
                  value={paymentStatus}
                  onChange={setPaymentStatus}
                >
                  <Option value="pending">Pending</Option>
                  <Option value="completed">Completed</Option>
                  <Option value="failed">Failed</Option>
                  <Option value="refunded">Refunded</Option>
                </Select>
              </div>

              <div>
                <Text strong>Balance Status</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Switch
                    checkedChildren={<CheckOutlined />}
                    unCheckedChildren={<CloseOutlined />}
                    checked={isBalance === true}
                    onChange={(checked) => setIsBalance(checked)}
                  />
                  <Text>{isBalance === true ? "Balance Due" : "No Balance Due"}</Text>
                </div>
              </div>

              <div>
                <Text strong>Plan</Text>
                <Select
                  style={{ width: '100%' }}
                  value={selectedPlan}
                  onChange={(value) => {
                    setSelectedPlan(value)
                    const plan = plans.find(p => p.title === value)
                    if (plan) setPrice(plan.price)
                  }}
                >
                  {plans.map((plan) => (
                    <Option key={plan._id} value={plan.title}>
                      {plan.title} - د.إ{plan.price}
                    </Option>
                  ))}
                </Select>
              </div>

              <div>
                <Text strong>Price (AED)</Text>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  min="0"
                  step="0.01"
                  prefix={<DollarOutlined />}
                />
              </div>

              <div>
                <Text strong>Meeting Link</Text>
                <Input
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/..."
                />
              </div>
            </Space>
          </Card>

          <Card title="Appointment Main Date" size="small" style={{ marginBottom: 16 }}>
            <div>
  <DatePicker
    showTime
    style={{ width: '100%' }}
    value={mainAppointmentDate}
    onChange={(date) => setMainAppointmentDate(date)}
    format="YYYY-MM-DD HH:mm"
  />
</div>
          </Card>

          {/* Recurring Sessions */}
          <Card 
            title={`Recurring Sessions (${recurringSessions.length})`}
            size="small"
            extra={
              <Button 
                type="dashed" 
                icon={<PlusOutlined />}
                onClick={addRecurringSession}
              >
                Add Session
              </Button>
            }
          >
            {recurringSessions.length === 0 ? (
              <Alert 
                message="No recurring sessions"
                description="Add recurring sessions for this appointment"
                type="info"
                showIcon
              />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                {recurringSessions.map((session, index) => (
                  <Card key={index} size="small">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>Session {index + 1}</Text>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 16 }}>
                        <div>
                          <Text type="secondary">Date & Time</Text>
                          <DatePicker
                            showTime
                            style={{ width: '100%' }}
                            value={dayjs(session.date)}
                            onChange={(date) => updateRecurringSession(index, 'date', date?.toISOString())}
                            format="YYYY-MM-DD HH:mm"
                            suffixIcon={<CalendarOutlined />}
                          />
                        </div>
                        <div>
                          <Text type="secondary">Status</Text>
                          <Select
                            style={{ width: '100%' }}
                            value={session.status}
                            onChange={(value) => updateRecurringSession(index, 'status', value)}
                          >
                            <Option value="in_progress">In Progress</Option>
                            <Option value="completed">Completed</Option>
                          </Select>
                        </div>
                        <div>
                          <Text type="secondary">Payment</Text>
                          <Select
                            style={{ width: '100%' }}
                            value={session.payment}
                            onChange={(value) => updateRecurringSession(index, 'payment', value)}
                          >
                            <Option value="unpaid">Unpaid</Option>
                            <Option value="paid">Paid</Option>
                          </Select>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeRecurringSession(index)}
                          size="small"
                        >
                          Remove Session
                        </Button>
                      </div>
                    </Space>
                  </Card>
                ))}
              </Space>
            )}
          </Card>
        </div>
      )}
    </Modal>
  )
}