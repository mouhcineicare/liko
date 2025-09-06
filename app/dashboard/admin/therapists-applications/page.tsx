"use client"

import { useState, useEffect } from "react"
import { 
  Card, 
  Button, 
  Input, 
  Table, 
  Pagination, 
  Select, 
  Tag, 
  Space,
  Spin,
  Empty,
  message,
  Badge
} from "antd"
import { 
  SearchOutlined,
  EyeOutlined,
  FileTextOutlined,
  CalendarOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined
} from "@ant-design/icons"
import TherapistApplicationDialog from "@/components/dashboard/admin/TherapistApplicationDialog"

const { Option } = Select

interface TherapistApplication {
  _id: string
  personalInfo: {
    fullName: string
    email: string
    phoneNumber: string
  }
  licensure: {
    licenseNumber: string
  }
  status: "pending" | "reviewing" | "approved" | "rejected"
  createdAt: string
}

export default function TherapistApplicationsPage() {
  const [applications, setApplications] = useState<TherapistApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null)
  const [showApplicationDialog, setShowApplicationDialog] = useState(false)

  const fetchApplications = async (page = 1, search = "", status = "all") => {
    setIsLoading(true)
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
        ...(status !== "all" && { status }),
      })

      const response = await fetch(`/api/admin/therapist-applications?${queryParams.toString()}`)

      if (!response.ok) {
        throw new Error("Failed to fetch applications")
      }

      const data = await response.json()
      setApplications(data.applications)
      setTotalPages(data.totalPages)
      setCurrentPage(data.currentPage)
    } catch (error) {
      console.error("Error fetching applications:", error)
      message.error("Failed to load applications")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications(currentPage, searchTerm, statusFilter)
  }, [])

  const handleSearch = () => {
    setCurrentPage(1)
    fetchApplications(1, searchTerm, statusFilter)
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
    fetchApplications(1, searchTerm, value)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchApplications(page, searchTerm, statusFilter)
  }

  const handleViewApplication = (id: string) => {
    setSelectedApplication(id)
    setShowApplicationDialog(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusTag = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Approved
          </Tag>
        )
      case "rejected":
        return (
          <Tag icon={<CloseCircleOutlined />} color="error">
            Rejected
          </Tag>
        )
      case "reviewing":
        return (
          <Tag icon={<FileTextOutlined />} color="processing">
            Reviewing
          </Tag>
        )
      default:
        return (
          <Tag icon={<ClockCircleOutlined />} color="warning">
            Pending
          </Tag>
        )
    }
  }

  const columns = [
    {
      title: 'Name',
      dataIndex: ['personalInfo', 'fullName'],
      key: 'name',
      render: (text: string) => (
        <div>
          <UserOutlined style={{ marginRight: 8, color: '#888' }} />
          {text}
        </div>
      )
    },
    {
      title: 'Email',
      dataIndex: ['personalInfo', 'email'],
      key: 'email'
    },
    {
      title: 'Phone',
      dataIndex: ['personalInfo', 'phoneNumber'],
      key: 'phone'
    },
    {
      title: 'License #',
      dataIndex: ['licensure', 'licenseNumber'],
      key: 'license'
    },
    {
      title: 'Date Applied',
      dataIndex: 'createdAt',
      key: 'date',
      render: (date: string) => (
        <div>
          <CalendarOutlined style={{ marginRight: 8, color: '#888' }} />
          {formatDate(date)}
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status)
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: TherapistApplication) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />}
          onClick={() => handleViewApplication(record._id)}
        >
          View
        </Button>
      )
    }
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Therapist Applications</h1>
      </div>

      <Card 
        title="Applications" 
        bordered={false}
        extra={
          <Space size="middle">
            <Input
              placeholder="Search by name, email or license..."
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 300 }}
            />
            <Select
              value={statusFilter}
              onChange={handleStatusChange}
              style={{ width: 150 }}
            >
              <Option value="all">All Status</Option>
              <Option value="pending">Pending</Option>
              <Option value="reviewing">Reviewing</Option>
              <Option value="approved">Approved</Option>
              <Option value="rejected">Rejected</Option>
            </Select>
            <Button type="primary" onClick={handleSearch}>
              Search
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={applications}
          rowKey="_id"
          loading={isLoading}
          locale={{
            emptyText: (
              <Empty
                image={<FileTextOutlined style={{ fontSize: 48, color: '#888' }} />}
                description={
                  <div>
                    <p>No applications found</p>
                    {(searchTerm || statusFilter !== "all") && (
                      <Button 
                        type="link" 
                        onClick={() => {
                          setSearchTerm("")
                          setStatusFilter("all")
                          fetchApplications(1, "", "all")
                        }}
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                }
              />
            )
          }}
          pagination={false}
        />

        {!isLoading && applications.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <Pagination
              current={currentPage}
              total={totalPages * 10} // Assuming 10 items per page
              pageSize={10}
              onChange={handlePageChange}
              showSizeChanger={false}
            />
          </div>
        )}
      </Card>

      {/* Application Details Dialog */}
      {selectedApplication && (
        <TherapistApplicationDialog
          applicationId={selectedApplication}
          open={showApplicationDialog}
          onOpenChange={setShowApplicationDialog}
          onStatusChange={() => fetchApplications(currentPage, searchTerm, statusFilter)}
        />
      )}
    </div>
  )
}