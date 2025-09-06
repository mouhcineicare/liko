"use client"

import { useState, useEffect } from "react"
import { 
  Table, 
  Input, 
  Button, 
  Dropdown, 
  Menu, 
  Pagination, 
  Select, 
  Tag, 
  Spin, 
  message,
  Space,
  Modal,
  Badge,
  Form,
  Grid,
  Tooltip
} from "antd"
import { 
  SearchOutlined, 
  MoreOutlined, 
  StopOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  CheckCircleOutlined,
  FileTextOutlined,
  CreditCardOutlined,
  UserOutlined,
  PlusOutlined,
  UserSwitchOutlined
} from "@ant-design/icons"
import AddTherapistDialog from "./AddTherapistDialog"
import EditTherapistDialog from "./EditTherapistDialog"
import TherapistProfileDialog from "./TherapistProfileDialog"
import PaymentDetailsDialog from "./PaymentDetailsDialog"
import ViewPatientsDialog from "./ViewPatientsDialog"
import { useForm } from "antd/lib/form/Form"


const { useBreakpoint } = Grid;

interface Therapist {
  _id: string
  fullName: string
  email: string
  telephone: string
  specialties: string[]
  createdAt: string
  status: "active" | "banned" | "pending" | "in_review"
  profile: string
  payoutInfo?: {
    expectedPayoutDate: string | null
    payoutFrequency: 'weekly' | 'biweekly' | 'monthly' | 'manual'
  }
}

interface PaginationData {
  currentPage: number
  totalPages: number
  totalTherapists: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export default function TherapistsList() {
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [selectedTherapistId, setSelectedTherapistId] = useState<string | null>(null)
  const [showPaymentDetailsDialog, setShowPaymentDetailsDialog] = useState(false)
  const [selectedTherapistForPayment, setSelectedTherapistForPayment] = useState<{ id: string; name: string } | null>(null)
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalTherapists: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showPatientsDialog, setShowPatientsDialog] = useState(false)
  const [selectedTherapistForPatients, setSelectedTherapistForPatients] = useState<{ id: string; name: string } | null>(null)
  const [impersonateModalVisible, setImpersonateModalVisible] = useState(false)
  const [impersonateLoading, setImpersonateLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [form] = Form.useForm()
  const screens = useBreakpoint()
  const [payoutForm] = useForm()
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [currentTherapistPayout, setCurrentTherapistPayout] = useState<{
    id: string
    name: string
    data: any
  } | null>(null)

  const formatPayoutDate = (date: string | null) => {
    if (!date) return "Not set"
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleOpenPayoutModal = async (therapistId: string, therapistName: string) => {
    try {
      setPayoutLoading(true)
      const response = await fetch(`/api/therapist/payout-info?therapistId=${therapistId}`)
      const data = await response.json()
      
      setCurrentTherapistPayout({
        id: therapistId,
        name: therapistName,
        data
      })
      
      payoutForm.setFieldsValue(data)
      setShowPayoutModal(true)
    } catch (error) {
      message.error("Failed to load payout information")
    } finally {
      setPayoutLoading(false)
    }
  }

const handleUpdatePayout = async () => {
  try {
    setPayoutLoading(true);
    const values = await payoutForm.validateFields();
    
    const response = await fetch('/api/therapist/payout-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        therapistId: currentTherapistPayout?.id,
        payoutData: {
          payoutSettings: {
            schedule: values.payoutSettings?.schedule || 'weekly',
            minimumAmount: values.payoutSettings?.minimumAmount || 0
          },
          bankDetails: values.bankDetails || {},
          otherPaymentDetails: values.otherPaymentDetails || '',
          paymentLink: values.paymentLink || ''
        }
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to update payout info");
    }

    message.success("Payout information updated successfully");
    setShowPayoutModal(false);
    
    // Force refresh the therapists list
    fetchTherapists(pagination.currentPage, itemsPerPage, searchTerm);
    
  } catch (error) {
    console.error("Error updating payout info:", error);
    message.error(error instanceof Error ? error.message : "Failed to update payout info");
  } finally {
    setPayoutLoading(false);
  }
};

  const handleImpersonate = (user: any) => {
    if (user.status !== 'active') {
      message.warning('Cannot impersonate inactive or banned users')
      return
    }
    setSelectedUser(user)
    setImpersonateModalVisible(true)
  }

  const handleImpersonateSubmit = async () => {
    try {
      if (!selectedUser) return;
      
      setImpersonateLoading(true);
      const values = await form.validateFields();
      
      const response = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser._id,
          password: values.password
        })
      });
  
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to impersonate user');
      }
  
      const { redirectUrl } = await response.json();
      window.location.href = redirectUrl;
    } catch (error) {
      console.error('Error impersonating user:', error);
      message.error(error instanceof Error ? error.message : 'Failed to impersonate user');
    } finally {
      setImpersonateLoading(false);
    }
  };

  const handleImpersonateCancel = () => {
    setImpersonateModalVisible(false)
    form.resetFields()
    setSelectedUser(null)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTherapists(1, itemsPerPage, searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm, itemsPerPage])

  const handleViewPatients = (therapistId: string, therapistName: string) => {
    setSelectedTherapistForPatients({ id: therapistId, name: therapistName })
    setShowPatientsDialog(true)
  }

  const fetchTherapists = async (page: number, limit: number, query: string = "") => {
    try {
      setIsLoading(true)
      setError(null)
      
      const url = `/api/admin/users/therapists?page=${page}&limit=${limit}&populatePayout=true${
        query ? `&search=${encodeURIComponent(query)}` : ""
      }`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error("Failed to fetch therapists")
      }
      
      const data = await response.json()
      setTherapists(data.therapists)
      setPagination(data.pagination)
    } catch (error) {
      console.error("Error fetching therapists:", error)
      setError("Failed to load therapists")
      message.error("Failed to load therapists")
      setTherapists([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleBanUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/ban`, {
        method: "PUT",
      })

      if (!response.ok) {
        throw new Error("Failed to update user status")
      }

      message.success("User status updated successfully")
      fetchTherapists(pagination.currentPage, itemsPerPage, searchTerm)
    } catch (error) {
      console.error("Error updating user status:", error)
      message.error("Failed to update user status")
    }
  }

  const handleActivateUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/activate`, {
        method: "PUT",
      })

      if (!response.ok) {
        throw new Error("Failed to activate user")
      }

      message.success("User activated successfully")
      fetchTherapists(pagination.currentPage, itemsPerPage, searchTerm)
    } catch (error) {
      console.error("Error activating user:", error)
      message.error("Failed to activate user")
    }
  }

  const handleDeleteUser = async (userId: string) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this therapist?',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const response = await fetch(`/api/admin/users/${userId}`, {
            method: "DELETE",
          })

          if (!response.ok) {
            throw new Error("Failed to delete user")
          }

          message.success("Therapist deleted successfully")
          fetchTherapists(pagination.currentPage, itemsPerPage, searchTerm)
        } catch (error) {
          console.error("Error deleting therapist:", error)
          message.error("Failed to delete therapist")
        }
      }
    })
  }

  const handleEdit = (therapist: Therapist) => {
    setSelectedTherapist(therapist)
    setShowEditDialog(true)
  }

  const handleViewProfile = (therapistId: string) => {
    setSelectedTherapistId(therapistId)
    setShowProfileDialog(true)
  }

  const handleEditSuccess = () => {
    fetchTherapists(pagination.currentPage, itemsPerPage, searchTerm)
  }

  const handleViewPaymentDetails = (therapistId: string, therapistName: string) => {
    setSelectedTherapistForPayment({ id: therapistId, name: therapistName })
    setShowPaymentDetailsDialog(true)
  }

  const handlePageChange = (page: number, pageSize: number) => {
    setItemsPerPage(pageSize)
    fetchTherapists(page, pageSize, searchTerm)
  }

  const getCommonColumns = () => [
    {
      title: 'Name',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (text: string) => <span className="font-medium">Dr. {text}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag 
          color={
            status === "active" ? "green" : 
            status === "banned" ? "red" : 
            status === "in_review" ? "blue" : "orange"
          }
        >
          {status === 'in_review' ? "In Review" : status}
        </Tag>
      ),
    },
    {
      title: 'Next Payout',
      dataIndex: ['payoutInfo', 'expectedPayoutDate'],
      key: 'payoutDate',
      render: (date: string | null, record: Therapist) => (
    <Tooltip title={`Frequency: ${record.payoutInfo?.payoutFrequency || 'weekly'}`}>
      <Tag color="blue">
        {date ? formatPayoutDate(date) : 'Not set'}
      </Tag>
    </Tooltip>
  ),
    }
  ]

  const getMobileColumns = () => [
    ...getCommonColumns(),
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Therapist) => (
        <Dropdown
          overlay={
            <Menu>
              <Menu.Item 
                key="view-profile" 
                icon={<FileTextOutlined />}
                onClick={() => handleViewProfile(record._id)}
              >
                View Profile
              </Menu.Item>
              <Menu.Item 
                key="view-patients" 
                icon={<UserOutlined />}
                onClick={() => handleViewPatients(record._id, record.fullName)}
              >
                View Patients
              </Menu.Item>
              <Menu.Item 
                key="payout-settings" 
                icon={<CreditCardOutlined />}
                onClick={() => handleOpenPayoutModal(record._id, record.fullName)}
              >
                Payout Settings
              </Menu.Item>
              {record.status !== "active" && (
                <Menu.Item 
                  key="activate" 
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleActivateUser(record._id)}
                >
                  Activate
                </Menu.Item>
              )}
              {record.status !== "banned" && (
                <Menu.Item 
                  key="ban" 
                  icon={<StopOutlined />}
                  onClick={() => handleBanUser(record._id)}
                >
                  Ban User
                </Menu.Item>
              )}
              <Menu.Item 
                key="edit" 
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                Edit
              </Menu.Item>
              <Menu.Item 
                key="impersonate" 
                icon={<UserSwitchOutlined />}
                onClick={() => handleImpersonate(record)}
              >
                Login as User
              </Menu.Item>
              <Menu.Item 
                key="delete" 
                icon={<DeleteOutlined />}
                danger
                onClick={() => handleDeleteUser(record._id)}
              >
                Delete
              </Menu.Item>
            </Menu>
          }
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} size="small" />
        </Dropdown>
      ),
    }
  ]

  const getDesktopColumns = () => [
    ...getCommonColumns(),
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Phone',
      dataIndex: 'telephone',
      key: 'telephone',
    },
    {
      title: 'Specialties',
      dataIndex: 'specialties',
      key: 'specialties',
      render: (specialties: string[]) => (
        <div className="flex flex-wrap gap-1">
          {specialties?.length > 0 ? (
            specialties.map((specialty, index) => (
              <Tag color="blue" key={index}>{specialty}</Tag>
            ))
          ) : (
            <span className="text-gray-400">No specialties</span>
          )}
        </div>
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Therapist) => (
        <Dropdown
          overlay={
            <Menu>
              <Menu.Item 
                key="view-profile" 
                icon={<FileTextOutlined />}
                onClick={() => handleViewProfile(record._id)}
              >
                View Profile
              </Menu.Item>
              <Menu.Item 
                key="view-patients" 
                icon={<UserOutlined />}
                onClick={() => handleViewPatients(record._id, record.fullName)}
              >
                View Patients
              </Menu.Item>
              <Menu.Item 
                key="payment-details" 
                icon={<CreditCardOutlined />}
                onClick={() => handleViewPaymentDetails(record._id, record.fullName)}
              >
                Payment Details
              </Menu.Item>
              <Menu.Item 
                key="payout-settings" 
                icon={<CreditCardOutlined />}
                onClick={() => handleOpenPayoutModal(record._id, record.fullName)}
              >
                Payout Settings
              </Menu.Item>
              {record.status !== "active" && (
                <Menu.Item 
                  key="activate" 
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleActivateUser(record._id)}
                >
                  Activate
                </Menu.Item>
              )}
              {record.status !== "banned" && (
                <Menu.Item 
                  key="ban" 
                  icon={<StopOutlined />}
                  onClick={() => handleBanUser(record._id)}
                >
                  Ban User
                </Menu.Item>
              )}
              <Menu.Item 
                key="edit" 
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                Edit
              </Menu.Item>
              <Menu.Item 
                key="impersonate" 
                icon={<UserSwitchOutlined />}
                onClick={() => handleImpersonate(record)}
              >
                Login as User
              </Menu.Item>
              <Menu.Item 
                key="delete" 
                icon={<DeleteOutlined />}
                danger
                onClick={() => handleDeleteUser(record._id)}
              >
                Delete
              </Menu.Item>
            </Menu>
          }
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} size="small" />
        </Dropdown>
      ),
    }
  ]

  if (isLoading && therapists.length === 0) {
    return <div className="text-center py-4"><Spin tip="Loading therapists..." /></div>
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-600">
        {error}
        <Button 
          onClick={() => fetchTherapists(1, itemsPerPage, searchTerm)} 
          className="ml-2"
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className={`flex ${screens.md ? 'flex-row items-center justify-between' : 'flex-col gap-3'}`}>
        <Input
          placeholder="Search therapists..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size={screens.md ? 'middle' : 'small'}
          className={screens.md ? 'w-64' : 'w-full'}
        />
        <Space className={screens.md ? '' : 'w-full justify-between'}>
          <Select
            value={itemsPerPage}
            onChange={setItemsPerPage}
            options={[
              { value: 5, label: '5 per page' },
              { value: 10, label: '10 per page' },
              { value: 20, label: '20 per page' },
              { value: 50, label: '50 per page' },
            ]}
            size={screens.md ? 'middle' : 'small'}
            className={screens.md ? 'w-32' : 'w-28'}
          />
          <AddTherapistDialog 
            onSuccess={() => fetchTherapists(1, itemsPerPage, searchTerm)}
            buttonSize={screens.md ? 'middle' : 'small'}
          />
        </Space>
      </div>

      <Table
        columns={screens.md ? getDesktopColumns() : getMobileColumns()}
        dataSource={therapists}
        rowKey="_id"
        pagination={false}
        loading={isLoading}
        size={screens.md ? 'middle' : 'small'}
        scroll={{ x: true }}
        locale={{
          emptyText: searchTerm ? "No therapists found matching your search" : "No therapists available"
        }}
      />

      {pagination.totalPages > 1 && (
        <div className={`flex flex-wrap max-w-[80%] ${screens.md ? 'items-center justify-between' : 'flex-col gap-3 items-center'}`}>
          <div className="text-sm text-gray-500">
            Showing {(pagination.currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(pagination.currentPage * itemsPerPage, pagination.totalTherapists)} of {pagination.totalTherapists}{" "}
            therapists
          </div>
          <Pagination
            current={pagination.currentPage}
            total={pagination.totalTherapists}
            pageSize={itemsPerPage}
            onChange={handlePageChange}
            showSizeChanger={false}
            size={screens.md ? 'default' : 'small'}
            simple={!screens.md}
          />
        </div>
      )}

      {selectedTherapist && (
        <EditTherapistDialog
          therapist={selectedTherapist}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSuccess={handleEditSuccess}
        />
      )}

      {selectedTherapistId && (
        <TherapistProfileDialog
          therapistId={selectedTherapistId}
          open={showProfileDialog}
          onOpenChange={setShowProfileDialog}
        />
      )}

      {selectedTherapistForPayment && (
        <PaymentDetailsDialog
          therapistId={selectedTherapistForPayment.id}
          therapistName={selectedTherapistForPayment.name}
          open={showPaymentDetailsDialog}
          onOpenChange={setShowPaymentDetailsDialog}
        />
      )}

      {selectedTherapistForPatients && (
        <ViewPatientsDialog
          therapistId={selectedTherapistForPatients.id}
          open={showPatientsDialog}
          onOpenChange={setShowPatientsDialog}
        />
      )}

      <Modal
        title={`Login as ${selectedUser?.fullName}`}
        open={impersonateModalVisible}
        onOk={handleImpersonateSubmit}
        onCancel={handleImpersonateCancel}
        confirmLoading={impersonateLoading}
        okText="Login"
        cancelText="Cancel"
        destroyOnClose
        width={screens.md ? 520 : '90%'}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ password: '' }}
        >
          <Form.Item
            name="password"
            label="Impersonation Password"
            rules={[
              { required: true, message: 'Please enter the impersonation password' },
              { min: 8, message: 'Password must be at least 8 characters' }
            ]}
          >
            <Input.Password 
              placeholder="Enter the impersonation password"
              autoComplete="off"
              size={screens.md ? 'middle' : 'small'}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Payout Settings for ${currentTherapistPayout?.name || 'Therapist'}`}
        open={showPayoutModal}
        onOk={handleUpdatePayout}
        onCancel={() => setShowPayoutModal(false)}
        confirmLoading={payoutLoading}
        width={800}
        destroyOnClose
      >
        <Spin spinning={payoutLoading}>
          <Form
            form={payoutForm}
            layout="vertical"
            initialValues={{
              payoutSettings: {
                schedule: 'weekly',
                minimumAmount: 0
              },
              bankDetails: {},
              otherPaymentDetails: '',
              paymentLink: ''
            }}
          >
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h3 className="font-medium text-lg">Payout Schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Form.Item
                    name={['payoutSettings', 'schedule']}
                    label="Frequency"
                    rules={[{ required: true, message: 'Please select payout frequency' }]}
                  >
                    <Select
                      options={[
                        { value: 'weekly', label: 'Weekly' },
                        { value: 'biweekly', label: 'Bi-weekly' },
                        { value: 'monthly', label: 'Monthly' },
                        { value: 'manual', label: 'Manual' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item
                    name={['payoutSettings', 'minimumAmount']}
                    label="Minimum Payout Amount"
                  >
                    <Input type="number" prefix="AED" />
                  </Form.Item>
                </div>
              </div>

              <div className="border-b pb-4">
                <h3 className="font-medium text-lg">Bank Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Form.Item
                    name={['bankDetails', 'accountName']}
                    label="Account Name"
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name={['bankDetails', 'accountNumber']}
                    label="Account Number"
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name={['bankDetails', 'routingNumber']}
                    label="Routing Number"
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name={['bankDetails', 'swiftCode']}
                    label="SWIFT Code"
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name={['bankDetails', 'bankName']}
                    label="Bank Name"
                  >
                    <Input />
                  </Form.Item>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-lg">Alternative Payment Methods</h3>
                <Form.Item
                  name="otherPaymentDetails"
                  label="USDT Wallet or Other Details"
                  className="mt-4"
                >
                  <Input.TextArea rows={3} />
                </Form.Item>
                <Form.Item
                  name="paymentLink"
                  label="Payment Link (if applicable)"
                >
                  <Input />
                </Form.Item>
              </div>
            </div>
          </Form>
        </Spin>
      </Modal>
    </div>
  )
}