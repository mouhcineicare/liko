"use client"

import { useState, useEffect } from "react"
import { 
  Card, 
  Table, 
  Select, 
  Button, 
  Input, 
  Pagination, 
  Tag, 
  Space,
  Spin,
  Typography,
  message
} from "antd"
import { 
  SearchOutlined,
  LoadingOutlined
} from "@ant-design/icons"
import { format } from "date-fns"

const { Text } = Typography

interface TherapyChangeRequest {
  _id: string
  patient: {
    fullName: string
    email: string
  }
  currentTherapist: {
    fullName: string
  }
  newTherapist?: {
    fullName: string
  }
  reason: string
  status: string
  createdAt: string
}

interface Therapist {
  _id: string
  fullName: string
}

interface PaginationData {
  currentPage: number
  totalPages: number
  totalRequests: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export default function TherapyChangesPage() {
  const [requests, setRequests] = useState<TherapyChangeRequest[]>([])
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [processingRequest, setProcessingRequest] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalRequests: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
      setPagination(prev => ({ ...prev, currentPage: 1 }))
    }, 500)

    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    fetchRequests(pagination.currentPage, itemsPerPage, searchQuery)
    fetchTherapists()
  }, [pagination.currentPage, itemsPerPage, searchQuery])

  const fetchRequests = async (page: number, limit: number, query: string) => {
    setIsLoading(true)
    try {
      const url = `/api/admin/therapy-changes?page=${page}&limit=${limit}${
        query ? `&search=${encodeURIComponent(query)}` : ""
      }`
      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to fetch requests")
      const data = await response.json()
      setRequests(data.requests)
      setPagination(data.pagination)
    } catch (error) {
      console.error("Error fetching requests:", error)
      message.error("Failed to load therapy change requests")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTherapists = async () => {
    try {
      const response = await fetch("/api/admin/therapists")
      if (!response.ok) throw new Error("Failed to fetch therapists")
      const data = await response.json()
      setTherapists(data)
    } catch (error) {
      console.error("Error fetching therapists:", error)
      message.error("Failed to load therapists")
    }
  }

  const handleAssignTherapist = async (requestId: string, newTherapistId: string) => {
    setProcessingRequest(requestId)
    try {
      const response = await fetch("/api/admin/therapy-changes", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          newTherapistId,
          status: "approved",
        }),
      })

      if (!response.ok) throw new Error("Failed to assign therapist")

      message.success("Therapist assigned successfully")
      fetchRequests(pagination.currentPage, itemsPerPage, searchQuery)
    } catch (error) {
      console.error("Error assigning therapist:", error)
      message.error("Failed to assign therapist")
    } finally {
      setProcessingRequest(null)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    setProcessingRequest(requestId)
    try {
      const response = await fetch("/api/admin/therapy-changes", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          status: "rejected",
        }),
      })

      if (!response.ok) throw new Error("Failed to reject request")

      message.success("Request rejected successfully")
      fetchRequests(pagination.currentPage, itemsPerPage, searchQuery)
    } catch (error) {
      console.error("Error rejecting request:", error)
      message.error("Failed to reject request")
    } finally {
      setProcessingRequest(null)
    }
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return
    fetchRequests(page, itemsPerPage, searchQuery)
  }

  const handleItemsPerPageChange = (value: string) => {
    const newLimit = Number.parseInt(value)
    setItemsPerPage(newLimit)
    fetchRequests(1, newLimit, searchQuery)
  }

  const getStatusTag = (status: string) => {
    switch (status) {
      case "approved":
        return <Tag color="success">Approved</Tag>
      case "rejected":
        return <Tag color="error">Rejected</Tag>
      default:
        return <Tag color="warning">Pending</Tag>
    }
  }

  const columns = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      render: (date: string) => format(new Date(date), "PPp")
    },
    {
      title: 'Patient',
      dataIndex: ['patient', 'fullName'],
      key: 'patient',
      render: (text: string, record: TherapyChangeRequest) => (
        <div>
          <Text strong>{text || "removed"}</Text>
          <div>
            <Text type="secondary">{record.patient?.email || "removed"}</Text>
          </div>
        </div>
      )
    },
    {
      title: 'Current Therapist',
      dataIndex: ['currentTherapist', 'fullName'],
      key: 'currentTherapist',
      render: (text: string) => text ? `Dr. ${text}` : "removed"
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status)
    },
    {
      title: 'New Therapist',
      key: 'newTherapist',
      render: (_: any, record: TherapyChangeRequest) => {
        if (record.status === "pending") {
          return (
            <Select
              style={{ width: 200 }}
              placeholder="Select therapist"
              onChange={(value) => handleAssignTherapist(record._id, value)}
              loading={processingRequest === record._id}
            >
              {therapists.map(therapist => (
                <Select.Option 
                  key={therapist._id} 
                  value={therapist._id}
                  disabled={record?.currentTherapist?.fullName === therapist?.fullName}
                >
                  Dr. {therapist.fullName}
                </Select.Option>
              ))}
            </Select>
          )
        }
        return record.newTherapist ? `Dr. ${record.newTherapist.fullName}` : "N/A"
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: TherapyChangeRequest) => {
        if (record.status === "pending") {
          return (
            <Button
              danger
              onClick={() => handleRejectRequest(record._id)}
              loading={processingRequest === record._id}
            >
              Reject
            </Button>
          )
        }
        return null
      }
    }
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 16 
      }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Therapy Change Requests</h1>
        <Space>
          <Input
            placeholder="Search patients or therapists..."
            prefix={<SearchOutlined />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ width: 300 }}
          />
          <span style={{ color: 'rgba(0, 0, 0, 0.45)' }}>Items per page:</span>
          <Select
            value={itemsPerPage.toString()}
            onChange={handleItemsPerPageChange}
            style={{ width: 80 }}
          >
            <Select.Option value="5">5</Select.Option>
            <Select.Option value="10">10</Select.Option>
            <Select.Option value="20">20</Select.Option>
            <Select.Option value="50">50</Select.Option>
          </Select>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={requests}
          rowKey="_id"
          loading={isLoading && {
            indicator: <Spin size="default" />
          }}
          pagination={false}
          scroll={{ x: true }}
          locale={{
            emptyText: 'No therapy change requests found'
          }}
        />

        {pagination.totalPages > 1 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginTop: 16 
          }}>
            <div style={{ color: 'rgba(0, 0, 0, 0.45)' }}>
              Showing {(pagination.currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(pagination.currentPage * itemsPerPage, pagination.totalRequests)} of {pagination.totalRequests}{' '}
              requests
            </div>
            <Pagination
              current={pagination.currentPage}
              total={pagination.totalRequests}
              pageSize={itemsPerPage}
              onChange={handlePageChange}
              showSizeChanger={false}
            />
          </div>
        )}
      </Card>
    </div>
  )
}