"use client"

import { useState, useEffect } from "react"
import { 
  Table, 
  Button, 
  Card, 
  Avatar, 
  Tag, 
  Modal, 
  List, 
  Progress, 
  Spin, 
  message,
  Divider,
  Tabs,
  Descriptions,
  Badge,
  Space,
  Typography,
  Input,
  Grid
} from 'antd'
import { 
  SearchOutlined,
  EyeOutlined,
  UserAddOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  WarningOutlined,
  TeamOutlined,
  CheckOutlined,
  CloseOutlined,
  LoadingOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { ColumnType } from "antd/es/table"
import { getStatusConfig, mapAppointmentStatus } from "@/lib/utils/statusMapping"

const { Text } = Typography
const { TabPane } = Tabs
const { useBreakpoint } = Grid

interface OnboardingResponse {
  questionId: string
  question: string
  answer: string | string[] | boolean
  type: string
}

interface Therapist {
  _id: string
  fullName: string
  email: string
  image: string | null
  hasReachedLimit?: boolean
  patientCount?: number
  patientLimit?: number
  weeklyPatientsLimit?: number
  remainingWeeklySessions?: number
  specialties?: string[]
  languages?: string[]
  experience?: number
  bio?: string
  isAvailable?: boolean
}

interface AppointmentDetails {
  _id: string
  patient: {
    _id: string
    fullName: string
    email: string
    telephone: string
    image: string | null
  }
  therapist?: {
    _id: string
    fullName: string
    email: string
    image: string | null
    weeklyPatientsLimit: number
    remainingWeeklySessions: number
  }
  date: string
  status: string
  paymentStatus: string
  plan: string
  price: number
  createdAt: string
  oldTherapies: string[]
  onboarding?: {
    responses: OnboardingResponse[]
  }
  patientStats: {
    totalAppointments: number
    completedAppointments: number
    upcomingAppointments: number
  }
  therapistStats?: {
    totalAppointments: number
    completedAppointments: number
    upcomingAppointments: number
  }
  previousTherapists: Array<{
    _id: string
    fullName: string
    email: string
    image: string | null
    completedSessions: number
  }>
}

interface Appointment {
  _id: string
  patient: {
    fullName: string
    email?: string
  }
  plan: string
  price: number
  date: string
  status: string
  createdAt: string
  declineComment?: string
  oldTherapist?: {
    fullName: string
  }
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export default function MatchingPage() {
  const screens = useBreakpoint()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadingAppointment, setLoadingAppointment] = useState<string | null>(null)
  const [showMatchingDialog, setShowMatchingDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [appointmentDetails, setAppointmentDetails] = useState<AppointmentDetails | null>(null)
  const [therapistLimits, setTherapistLimits] = useState<Record<string, boolean>>({})
  const [assigningTherapist, setAssigningTherapist] = useState<string | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [loadingTherapistPatients, setLoadingTherapistPatients] = useState<Record<string, boolean>>({})
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  })

  useEffect(() => {
    fetchAppointments()
    fetchTherapists()
  }, [pagination.page])

  const fetchAppointments = async () => {
    try {
      const response = await fetch(`/api/admin/appointments/unassigned?page=${pagination.page}&limit=${pagination.limit}`)
      if (response.ok) {
        const data = await response.json()
        setAppointments(data.data)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error("Error fetching appointments:", error)
      message.error("Failed to load appointments")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTherapists = async (appointmentDate?: string) => {
    try {
      const url = appointmentDate ? `/api/admin/therapists?date=${appointmentDate}` : "/api/admin/therapists"
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setTherapists(data)

        // Check limits for each therapist
        data.forEach((therapist: Therapist) => {
          checkTherapistLimit(therapist._id)
        })
      }
    } catch (error) {
      console.error("Error fetching therapists:", error)
      message.error("Failed to load therapists")
    }
  }

  const checkTherapistLimit = async (therapistId: string) => {
    try {
      // Get therapist details
      const detailsResponse = await fetch(`/api/admin/therapists/${therapistId}`)
      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json()

        // Update therapist in the list with session limit information
        setTherapists((prev) =>
          prev.map((t) =>
            t._id === therapistId
              ? {
                  ...t,
                  weeklyPatientsLimit: detailsData.weeklyPatientsLimit,
                  remainingWeeklySessions: detailsData.remainingWeeklySessions,
                }
              : t,
          ),
        )
      }

      // Get patient count for this therapist
      setLoadingTherapistPatients((prev) => ({ ...prev, [therapistId]: true }))
      const response = await fetch(`/api/admin/therapists/${therapistId}/patients`)
      if (response.ok) {
        const data = await response.json()

        // Update the therapist limits state
        setTherapistLimits((prev) => ({
          ...prev,
          [therapistId]: data.hasReachedLimit,
        }))

        // Update the therapist in the list with patient count information
        setTherapists((prev) =>
          prev.map((t) =>
            t._id === therapistId
              ? {
                  ...t,
                  hasReachedLimit: data.hasReachedLimit,
                  patientCount: data.patientCount,
                  patientLimit: data.patientLimit,
                }
              : t,
          ),
        )
      }
    } catch (error) {
      console.error(`Error checking therapist limit for ${therapistId}:`, error)
    } finally {
      setLoadingTherapistPatients((prev) => ({ ...prev, [therapistId]: false }))
    }
  }

  const handleAssignTherapist = async (appointmentId: string, therapist: Therapist) => {
    setAssigningTherapist(therapist._id)
    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}/assign`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ therapistId: therapist._id, isConfirmed: therapist.isAvailable || false }),
      })

      if (!response.ok) {
        throw new Error("Failed to assign therapist")
      }

      message.success("Therapist assigned successfully")
      setShowMatchingDialog(false)
      fetchAppointments() // Refresh the list
    } catch (error) {
      console.error("Error assigning therapist:", error)
      message.error("Failed to assign therapist")
    } finally {
      setAssigningTherapist(null)
    }
  }

  const handleOpenMatching = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowMatchingDialog(true)
    fetchTherapists(appointment.date) // Pass the appointment date
  }

  const handleViewDetails = async (appointmentId: string) => {
    setLoadingDetails(true)
    setShowDetailsDialog(true)

    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch appointment details")
      }
      const data = await response.json()
      setAppointmentDetails(data)
    } catch (error) {
      console.error("Error fetching appointment details:", error)
      message.error("Failed to load appointment details")
    } finally {
      setLoadingDetails(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const getStatusDisplay = (appointment: any) => {
    const mappedStatus = mapAppointmentStatus(appointment);
    const statusConfig = getStatusConfig(mappedStatus);
    return statusConfig.label;
  }

  const getStatusColor = (appointment: any) => {
    const mappedStatus = mapAppointmentStatus(appointment);
    const statusConfig = getStatusConfig(mappedStatus);
    // Map our color classes to Ant Design tag colors
    if (statusConfig.bgColor.includes('green')) return 'success';
    if (statusConfig.bgColor.includes('red')) return 'error';
    if (statusConfig.bgColor.includes('yellow') || statusConfig.bgColor.includes('orange')) return 'warning';
    if (statusConfig.bgColor.includes('blue')) return 'processing';
    if (statusConfig.bgColor.includes('purple')) return 'purple';
    return 'default';
  }

  const columns: ColumnType<Appointment>[] = [
    {
      title: 'Patient',
      dataIndex: ['patient', 'fullName'],
      key: 'patient',
      responsive: ['md'],
      render: (_, record) => (
        <Text strong>{record.patient?.fullName || "removed"}</Text>
      )
    },
    {
      title: 'Plan',
      dataIndex: 'plan',
      key: 'plan',
      responsive: ['md']
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      responsive: ['md'],
      render: (price: number) => `د.إ${price}`
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => (
        <div className="flex items-center gap-2">
          <CalendarOutlined className="text-blue-500" />
          <div>
            <div>{dayjs(date).format(screens.md ? 'ddd, MMM D, YYYY' : 'MMM D')}</div>
            <div className="text-xs text-gray-500">
              <ClockCircleOutlined className="mr-1" />
              {dayjs(date).format('h:mm A')}
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: any) => (
        <Tag color={getStatusColor(record)}>
          {getStatusDisplay(record)}
        </Tag>
      )
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      responsive: ['sm'],
      render: (createdAt: string) => (
        <div className="flex items-center gap-2">
          <CalendarOutlined className="text-gray-500" />
          <div>
            <div>{dayjs(createdAt).format(screens.md ? 'MMM D, YYYY' : 'MMM D')}</div>
            {screens.md && (
              <div className="text-xs text-gray-500">
                <ClockCircleOutlined className="mr-1" />
                {dayjs(createdAt).format('h:mm A')}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'Prev. Therapist',
      dataIndex: ['oldTherapist', 'fullName'],
      key: 'oldTherapist',
      responsive: ['lg'],
      render: (_, record) => (
        record.oldTherapist ? (
          <div className="flex items-center gap-2">
            {screens.md && <Avatar size="small" icon={<UserOutlined />} />}
            <span>{screens.md ? `Dr. ${record.oldTherapist.fullName}` : 'Previous'}</span>
          </div>
        ) : 'None'
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Appointment) => (
        <Space>
          <Button 
            icon={<EyeOutlined />} 
            onClick={() => handleViewDetails(record._id)}
            size={screens.md ? 'middle' : 'small'}
          >
            {screens.md ? 'View' : ''}
          </Button>
          <Button 
            type="primary" 
            icon={<UserAddOutlined />}
            onClick={() => handleOpenMatching(record)}
            size={screens.md ? 'middle' : 'small'}
          >
            {screens.md ? 'Match' : ''}
          </Button>
        </Space>
      )
    }
  ]

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="default" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <Text strong style={{ fontSize: screens.md ? 20 : 18 }}>Patient Matching</Text>
        <Text type="secondary">{pagination.total} unassigned</Text>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={appointments}
          rowKey="_id"
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            onChange: handlePageChange,
            showSizeChanger: false,
            size: screens.md ? 'default' : 'small'
          }}
          scroll={{ x: true }}
          size={screens.md ? 'middle' : 'small'}
          locale={{
            emptyText: (
              <div className="py-8 text-center">
                <Text type="secondary">No unassigned appointments found</Text>
              </div>
            )
          }}
        />
      </Card>

      {/* Matching Modal */}
      <Modal
        title={`Match Patient with Therapist`}
        open={showMatchingDialog}
        onCancel={() => setShowMatchingDialog(false)}
        width={screens.lg ? 1000 : screens.md ? 800 : '90%'}
        footer={null}
        centered
      >
        <Text>
          Select a therapist to assign to {selectedAppointment?.patient.fullName}&apos;s appointment on{' '}
          {dayjs(selectedAppointment?.date).format('MMMM D, YYYY h:mm A')}
        </Text>

        <div className={`grid grid-cols-1 ${screens.md ? 'grid-cols-2' : ''} gap-4 mt-6`}>
          {therapists.map((therapist) => {
            const isDisabled = therapistLimits[therapist._id]
            const isAssigning = assigningTherapist === therapist._id
            const isLoading = loadingTherapistPatients[therapist._id]

            return (
              <Card 
                key={therapist._id} 
                className={isDisabled ? "opacity-60" : ""}
                hoverable
              >
                <div className="flex gap-4">
                  <Avatar size={screens.md ? 48 : 32} src={therapist.image}>
                    {therapist.fullName.charAt(0)}
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <Text strong>Dr. {therapist.fullName}</Text>
                      {therapist.isAvailable !== undefined ? (
                        <Badge 
                          status={therapist.isAvailable ? "success" : "error"} 
                          text={screens.sm ? therapist.isAvailable ? "Available" : "Unavailable" : ''}
                        />
                      ) : (
                        <Spin indicator={<LoadingOutlined style={{ fontSize: 14 }} spin />} />
                      )}
                    </div>
                    <Text type="secondary" className="text-xs md:text-base">{therapist.email}</Text>

                    {/* Patient count */}
                    <div className="mt-3">
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center">
                          <TeamOutlined className="mr-1 text-gray-500" />
                          <Text type="secondary">Patient Load</Text>
                        </div>
                        <Text strong>
                          {isLoading ? (
                            <Spin indicator={<LoadingOutlined style={{ fontSize: 14 }} spin />} />
                          ) : (
                            `${therapist.patientCount || 0}/${therapist.patientLimit || 0}`
                          )}
                        </Text>
                      </div>
                      <Progress
                        percent={
                          therapist.patientCount && therapist.patientLimit
                            ? Math.round((therapist.patientCount / therapist.patientLimit) * 100)
                            : 0
                        }
                        size="small"
                        status={therapist.hasReachedLimit ? "exception" : "normal"}
                      />
                    </div>

                    <div className={`grid grid-cols-1 ${screens.sm ? 'grid-cols-2' : ''} gap-3 mt-4`}>
                      {/* Specialties */}
                      {therapist.specialties && therapist.specialties.length > 0 && (
                        <div>
                          <Text type="secondary" className="text-xs">Specialties</Text>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {therapist.specialties.slice(0, screens.md ? 3 : 2).map((specialty, i) => (
                              <Tag key={i} color="blue">{specialty}</Tag>
                            ))}
                            {therapist.specialties.length > (screens.md ? 3 : 2) && (
                              <Tag color="blue">+{therapist.specialties.length - (screens.md ? 3 : 2)} more</Tag>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Languages */}
                      {therapist.languages && therapist.languages.length > 0 && (
                        <div>
                          <Text type="secondary" className="text-xs">Languages</Text>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {therapist.languages.slice(0, screens.md ? 2 : 1).map((language, i) => (
                              <Tag key={i} color="green">{language}</Tag>
                            ))}
                            {therapist.languages.length > (screens.md ? 2 : 1) && (
                              <Tag color="green">+{therapist.languages.length - (screens.md ? 2 : 1)} more</Tag>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Experience */}
                    {therapist.experience && (
                      <Text type="secondary" className="block mt-3 text-xs md:text-base">
                        {therapist.experience} years of experience
                      </Text>
                    )}

                    {/* Bio preview */}
                    {therapist.bio && (
                      <Text ellipsis className="block mt-2 text-xs md:text-base">
                        {therapist.bio}
                      </Text>
                    )}

                    <Button
                      type="primary"
                      block
                      className="mt-4"
                      disabled={isDisabled || isAssigning}
                      loading={isAssigning}
                      onClick={() => selectedAppointment && handleAssignTherapist(selectedAppointment._id, therapist)}
                      size={screens.md ? 'middle' : 'small'}
                    >
                      {isDisabled ? "Reached Limit" : "Select Therapist"}
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </Modal>

      {/* Appointment Details Modal */}
      <Modal
        title="Appointment Details"
        open={showDetailsDialog}
        onCancel={() => setShowDetailsDialog(false)}
        width={screens.lg ? 1000 : screens.md ? 800 : '90%'}
        footer={[
          <Button key="back" onClick={() => setShowDetailsDialog(false)}>
            Close
          </Button>
        ]}
        centered
      >
        {loadingDetails ? (
          <div className="flex justify-center items-center py-12">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
          </div>
        ) : appointmentDetails ? (
          <Tabs defaultActiveKey="1">
            <TabPane tab="Overview" key="1">
              <div className={`grid grid-cols-1 ${screens.lg ? 'grid-cols-3' : 'gap-6'}`}>
                {/* Patient Information */}
                <Card title="Patient Information">
                  <div className="flex items-start gap-4">
                    <Avatar size={screens.md ? 64 : 48} src={appointmentDetails.patient.image}>
                      {appointmentDetails.patient.fullName.charAt(0)}
                    </Avatar>
                    <div>
                      <Text strong className="block">{appointmentDetails.patient.fullName}</Text>
                      <Text type="secondary" className="block text-xs md:text-base">{appointmentDetails.patient.email}</Text>
                      <Text type="secondary" className="block text-xs md:text-base">{appointmentDetails.patient.telephone}</Text>
                    </div>
                  </div>

                  <Divider />

                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Total Sessions">
                      {appointmentDetails.patientStats.totalAppointments}
                    </Descriptions.Item>
                    <Descriptions.Item label="Completed">
                      {appointmentDetails.patientStats.completedAppointments}
                    </Descriptions.Item>
                    <Descriptions.Item label="Upcoming">
                      {appointmentDetails.patientStats.upcomingAppointments}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                {/* Therapist Information */}
                <Card title="Therapist Information">
                  {appointmentDetails.therapist ? (
                    <>
                      <div className="flex items-start gap-4">
                        <Avatar size={screens.md ? 64 : 48} src={appointmentDetails.therapist.image}>
                          {appointmentDetails.therapist.fullName.charAt(0)}
                        </Avatar>
                        <div>
                          <Text strong className="block">Dr. {appointmentDetails.therapist.fullName}</Text>
                          <Text type="secondary" className="block text-xs md:text-base">{appointmentDetails.therapist.email}</Text>
                        </div>
                      </div>

                      <Divider />

                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="Total Sessions">
                          {appointmentDetails.therapistStats?.totalAppointments}
                        </Descriptions.Item>
                        <Descriptions.Item label="Completed">
                          {appointmentDetails.therapistStats?.completedAppointments}
                        </Descriptions.Item>
                        <Descriptions.Item label="Upcoming">
                          {appointmentDetails.therapistStats?.upcomingAppointments}
                        </Descriptions.Item>
                        <Descriptions.Item label="Weekly Sessions">
                          {appointmentDetails.therapist.remainingWeeklySessions} / {appointmentDetails.therapist.weeklyPatientsLimit} remaining
                        </Descriptions.Item>
                      </Descriptions>

                      <Progress
                        percent={
                          appointmentDetails.therapist
                            ? 100 - Math.round(
                                (appointmentDetails.therapist.remainingWeeklySessions /
                                  appointmentDetails.therapist.weeklyPatientsLimit) *
                                  100
                              )
                            : 0
                        }
                        status={
                          appointmentDetails.therapist?.remainingWeeklySessions === 0
                            ? "exception"
                            : "normal"
                        }
                      />
                    </>
                  ) : (
                    <Text type="secondary">No therapist assigned</Text>
                  )}
                </Card>

                {/* Appointment Details */}
                <Card title="Appointment Details">
                  <Space direction="vertical" size="middle">
                    <div>
                      <Text type="secondary" className="block">Status</Text>
                      <div className="flex gap-2">
                        <Tag color={getStatusColor(appointmentDetails)}>
                          {getStatusDisplay(appointmentDetails)}
                        </Tag>
                        <Tag color={getStatusColor(appointmentDetails.paymentStatus)}>
                          {appointmentDetails.paymentStatus}
                        </Tag>
                      </div>
                    </div>

                    <div>
                      <Text type="secondary" className="block">Date & Time</Text>
                      <Text strong>
                        {dayjs(appointmentDetails.date).format(screens.md ? 'dddd, MMMM D, YYYY h:mm A' : 'MMM D, h:mm A')}
                      </Text>
                    </div>

                    <div>
                      <Text type="secondary" className="block">Plan</Text>
                      <Text strong>{appointmentDetails.plan}</Text>
                    </div>

                    <div>
                      <Text type="secondary" className="block">Price</Text>
                      <Text strong>د.إ{appointmentDetails.price}</Text>
                    </div>

                    <div>
                      <Text type="secondary" className="block">Created At</Text>
                      <Text strong>
                        {dayjs(appointmentDetails.createdAt).format(screens.md ? 'MMM D, YYYY h:mm A' : 'MMM D, h:mm A')}
                      </Text>
                    </div>
                  </Space>
                </Card>
              </div>

              {/* Previous Therapists */}
              {appointmentDetails.previousTherapists?.length > 0 && (
                <Card title="Previous Therapists" className="mt-6">
                  <List
                    dataSource={appointmentDetails.previousTherapists}
                    renderItem={(therapist) => (
                      <List.Item>
                        <div className="flex items-center gap-4">
                          <Avatar src={therapist.image}>{therapist.fullName.charAt(0)}</Avatar>
                          <div>
                            <Text strong>Dr. {therapist.fullName}</Text>
                            <Text type="secondary" className="block text-xs md:text-base">{therapist.email}</Text>
                            <Text type="secondary">{therapist.completedSessions} completed sessions</Text>
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                </Card>
              )}
            </TabPane>

            {/* Onboarding Information Tab */}
            <TabPane tab="Onboarding" key="2">
              {appointmentDetails.onboarding ? (
                <Tabs defaultActiveKey="all">
                  <TabPane tab="All Responses" key="all">
                    <List
                      dataSource={appointmentDetails.onboarding.responses}
                      renderItem={(response) => (
                        <List.Item>
                          <div className="w-full">
                            <Text strong className="block">{response.question}</Text>
                            {Array.isArray(response.answer) ? (
                              <ul className="list-disc pl-5 mt-2">
                                {response.answer.map((item, i) => (
                                  <li key={i}>
                                    <Text>{item}</Text>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <Text>
                                {typeof response.answer === "boolean"
                                  ? response.answer
                                    ? "Yes"
                                    : "No"
                                  : response.answer}
                              </Text>
                            )}
                          </div>
                        </List.Item>
                      )}
                    />
                  </TabPane>
                  <TabPane tab="Important Info" key="important">
                    <List
                      dataSource={appointmentDetails.onboarding.responses.filter(
                        (response) =>
                          response.question.toLowerCase().includes("goal") ||
                          response.question.toLowerCase().includes("concern") ||
                          response.question.toLowerCase().includes("previous therapy") ||
                          response.question.toLowerCase().includes("medical") ||
                          response.question.toLowerCase().includes("emergency"),
                      )}
                      renderItem={(response) => (
                        <List.Item>
                          <div className="w-full">
                            <Text strong className="block">{response.question}</Text>
                            {Array.isArray(response.answer) ? (
                              <ul className="list-disc pl-5 mt-2">
                                {response.answer.map((item, i) => (
                                  <li key={i}>
                                    <Text>{item}</Text>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <Text>
                                {typeof response.answer === "boolean"
                                  ? response.answer
                                    ? "Yes"
                                    : "No"
                                  : response.answer}
                              </Text>
                            )}
                          </div>
                        </List.Item>
                      )}
                    />
                  </TabPane>
                </Tabs>
              ) : (
                <Text type="secondary">No onboarding information available</Text>
              )}
            </TabPane>
          </Tabs>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <WarningOutlined className="text-3xl text-red-500 mb-4" />
            <Text strong className="text-lg">Appointment Not Found</Text>
            <Text type="secondary">The requested appointment could not be found.</Text>
          </div>
        )}
      </Modal>
    </div>
  )
}