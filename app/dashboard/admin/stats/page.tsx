"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Card, 
  Button, 
  Alert, 
  Row, 
  Col, 
  Statistic,
  Spin,
  Tag,
  Typography,
  message
} from "antd"
import { 
  WarningOutlined,
  ArrowRightOutlined
} from "@ant-design/icons"
import { format } from "date-fns"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  CartesianGrid, 
  ResponsiveContainer 
} from "recharts"

const { Title, Text } = Typography

interface DashboardStats {
  totalAppointments: number
  pendingAppointments: number
  activeAppointments: number
  completedAppointments: number
  totalPatients: number
  totalTherapists: number
  recentAppointments: Array<{
    _id: string
    patient: {
      fullName: string
    }
    therapist?: {
      fullName: string
    }
    date: string
    status: string
    plan: string
  }>
  unassignedAppointments: number
  appointmentTrends: Array<{ date: string; count: number }>
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch("/api/admin/dashboard/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)
      message.error("Failed to load dashboard data")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  // Data for charts
  const appointmentData = [
    { name: "Total", value: stats.totalAppointments },
    { name: "Pending", value: stats.pendingAppointments },
    { name: "Active", value: stats.activeAppointments },
    { name: "Completed", value: stats.completedAppointments },
  ]

  const appointmentStatusData = [
    { name: "Pending", value: stats.pendingAppointments },
    { name: "Active", value: stats.activeAppointments },
    { name: "Completed", value: stats.completedAppointments },
    { name: "Unassigned", value: stats.unassignedAppointments },
  ]

  const userDistributionData = [
    { name: "Patients", value: stats.totalPatients },
    { name: "Therapists", value: stats.totalTherapists },
  ]

  const COLORS = ["#FFBB28", "#00C49F", "#FF8042", "#0088FE"]

  const getStatusTag = (status: string) => {
    let color = ''
    switch (status) {
      case "completed":
        color = 'success'
        break
      case "cancelled":
        color = 'error'
        break
      case "pending":
        color = 'warning'
        break
      case "in_progress":
        color = 'processing'
        break
      default:
        color = 'default'
    }
    return <Tag color={color}>{status.replace('_', ' ')}</Tag>
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Admin Dashboard</Title>

      {/* Alert for Unassigned Appointments */}
      {stats.unassignedAppointments > 0 && (
        <Alert
          message={`You have ${stats.unassignedAppointments} unassigned appointment(s) waiting for matching`}
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          action={
            <Button 
              type="primary" 
              size="small"
              onClick={() => router.push("/dashboard/admin/matching")}
            >
              Match Now
            </Button>
          }
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Quick Stats Row */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Total Appointments" 
              value={stats.totalAppointments} 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Active Appointments" 
              value={stats.activeAppointments} 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Total Patients" 
              value={stats.totalPatients} 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Total Therapists" 
              value={stats.totalTherapists} 
            />
          </Card>
        </Col>
      </Row>

      {/* Charts Grid */}
      <Row gutter={[16, 16]}>
        {/* Bar Chart for Appointment Statistics */}
        <Col xs={24} md={12}>
          <Card title="Appointment Statistics">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={appointmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Pie Chart for Appointment Status Distribution */}
        <Col xs={24} md={12}>
          <Card title="Appointment Status Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={appointmentStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {appointmentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Pie Chart for User Distribution */}
        <Col xs={24} md={12}>
          <Card title="User Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={userDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {userDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Line Chart for Appointment Trends */}
        {stats.appointmentTrends && stats.appointmentTrends.length > 0 && (
          <Col xs={24} md={12}>
            <Card title="Appointment Trends">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.appointmentTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        )}
      </Row>

      {/* Recent Appointments */}
      <Card 
        title="Recent Appointments" 
        style={{ marginTop: 24 }}
        extra={
          <Button 
            type="link" 
            onClick={() => router.push("/dashboard/admin/appointments")}
            icon={<ArrowRightOutlined />}
          >
            View All
          </Button>
        }
      >
        <div style={{ display: 'grid', gap: 12 }}>
          {stats.recentAppointments.map((appointment) => (
            <Card 
              key={appointment._id}
              size="small"
              hoverable
              onClick={() => router.push(`/dashboard/admin/appointments/${appointment._id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text strong>{appointment.patient?.fullName || "removed"}</Text>
                  <div>
                    <Text type="secondary">
                      {appointment.therapist
                        ? `with Dr. ${appointment.therapist?.fullName || "removed"}`
                        : "Unassigned"}
                    </Text>
                  </div>
                  <Text type="secondary">
                    {format(new Date(appointment.date), "PPp")}
                  </Text>
                </div>
                {getStatusTag(appointment.status)}
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  )
}