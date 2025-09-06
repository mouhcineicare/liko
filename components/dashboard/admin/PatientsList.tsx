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
  Badge,
  Modal,
  Form,
  Grid,
  Checkbox
} from "antd"
import { 
  SearchOutlined, 
  MoreOutlined, 
  StopOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined, 
  CheckCircleOutlined,
  UserSwitchOutlined,
  CreditCardOutlined,
  DownloadOutlined
} from "@ant-design/icons"
import { useRouter } from "next/navigation"
import EditPatientDialog from "./EditPatientDialog"
import AddPatientDialog from "./AddPatientDialog"
import ChangeTherapistDialog from "./ChangeTherapistDialog"
import { saveAs } from "file-saver";
import BalanceManagementPopup from "./BalanceManagementPopup"


type SessionHistoryItem = {
  action: "add" | "remove"
  sessions: number
  planTitle?: string | null
  reason?: string | null
  admin?: string
  createdAt: string
}

type Patient = {
  _id: string
  fullName: string
  email: string
  telephone: string
  createdAt: string
  status: string
  image?: string
  therapy?: any
  stripeCustomerId?: string
  balance: {
    totalSessions: number
    spentSessions: number
    remainingSessions: number
    history: SessionHistoryItem[]
    payments: {
      paymentId: string;
      amount: number;
      currency: string;
      date: Date;
      planId: string;
      sessionsAdded: number;
    }[];
  }
}

interface PaginationData {
  currentPage: number
  totalPages: number
  totalPatients: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface Plan {
  _id: string;
  title: string;
  type: string;
  price: number;
}

const { useBreakpoint } = Grid;


export default function PatientsList() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showTherapistDialog, setShowTherapistDialog] = useState(false)
  const [showSessionsDialog, setShowSessionsDialog] = useState(false)
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalPatients: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [form] = Form.useForm()
  const action = Form.useWatch("action", form)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [impersonateModalVisible, setImpersonateModalVisible] = useState(false);
  const [impersonatePassword, setImpersonatePassword] = useState('');
  const [impersonateLoading, setImpersonateLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const screens = useBreakpoint();
  const [showOnlyWithBalance, setShowOnlyWithBalance] = useState(false);


  const handleImpersonate = (user: any) => {
    if (user.status !== 'active') {
      message.warning('Cannot impersonate inactive or banned users');
      return;
    }
    setSelectedUser(user);
    setImpersonateModalVisible(true);
  };

  const handleRefreshCustomerId = async (patientId: string) => {
    try {
      const response = await fetch(`/api/admin/patients/${patientId}/refresh-customer-id`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        message.success(data.message);
        // Refresh the patients list to get updated data
        fetchPatients(pagination.currentPage, itemsPerPage, searchTerm);
      } else {
        message.error(data.error || 'Failed to refresh customer ID');
      }
    } catch (error) {
      console.error('Error refreshing customer ID:', error);
      message.error('Failed to refresh customer ID');
    }
  };

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
    setImpersonateModalVisible(false);
    form.resetFields();
    setSelectedUser(null);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(1, itemsPerPage, searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm, itemsPerPage])

  useEffect(() => {
  const timer = setTimeout(() => {
    fetchPatients(1, itemsPerPage, searchTerm)
  }, 500)

  return () => clearTimeout(timer)
}, [searchTerm, itemsPerPage, showOnlyWithBalance]) // Added showOnlyWithBalance to dependencies

 const fetchPatients = async (page: number, limit: number, query = "") => {
  try {
    setIsLoading(true)
    setError(null)
    setIsLoadingHistory(true);

    const url = `/api/admin/users/patients?page=${page}&limit=${limit}${
      query ? `&search=${encodeURIComponent(query)}` : ""
    }${showOnlyWithBalance ? '&hasBalance=true' : ''}`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error("Failed to fetch patients")
    }

    const data = await response.json()
    setPatients(data.patients)
    setPagination(data.pagination)
  } catch (error) {
    console.error("Error fetching patients:", error)
    setError("Failed to load patients")
    message.error("Failed to load patients")
    setPatients([])
  } finally {
    setIsLoading(false)
    setIsLoadingHistory(false);
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
      fetchPatients(pagination.currentPage, itemsPerPage, searchTerm)
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
      fetchPatients(pagination.currentPage, itemsPerPage, searchTerm)
    } catch (error) {
      console.error("Error activating user:", error)
      message.error("Failed to activate user")
    }
  }

  const handleDeleteUser = async (userId: string) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this user?',
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

          message.success("User deleted successfully")
          fetchPatients(pagination.currentPage, itemsPerPage, searchTerm)
        } catch (error) {
          console.error("Error deleting user:", error)
          message.error("Failed to delete user")
        }
      }
    })
  }

  const handleViewDetails = (patientId: string) => {
    router.push(`/dashboard/admin/patients/${patientId}`)
  }

  const handleEdit = (patient: Patient) => {
    setSelectedPatient(patient)
    setShowEditDialog(true)
  }

  const handleChangeTherapist = (patient: Patient) => {
    setSelectedPatient(patient)
    setShowTherapistDialog(true)
  }

  const handleManageSessions = (patient: Patient) => {
    setSelectedPatient(patient)
    setShowSessionsDialog(true)
    form.resetFields()
  }

  const handleEditSuccess = () => {
    fetchPatients(pagination.currentPage, itemsPerPage, searchTerm)
  }

  const handleTherapistChangeSuccess = () => {
    fetchPatients(pagination.currentPage, itemsPerPage, searchTerm)
    setShowTherapistDialog(false)
  }

  const handleSessionsSubmit = async () => {
    try {
      const values = await form.validateFields();
      setIsLoading(true);
  
      let body;
      if (values.action === 'add') {
        body = {
          userId: selectedPatient?._id,
          action: values.action,
          planId: values.planId,
          sessions: values.sessions,
          reason: values.reason
        };
      } else {
        body = {
          userId: selectedPatient?._id,
          action: values.action,
          sessions: values.sessions,
          reason: values.reason
        };
      }
  
      const response = await fetch('/api/admin/users/patients/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });
  
      if (!response.ok) {
        throw new Error('Failed to update sessions');
      }
  
      message.success('Sessions updated successfully');
      fetchPatients(pagination.currentPage, itemsPerPage, searchTerm);
      setShowSessionsDialog(false);
    } catch (error) {
      console.error('Error updating sessions:', error);
      message.error(error instanceof Error ? error.message : 'Failed to update sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page: number, pageSize: number) => {
    setItemsPerPage(pageSize)
    fetchPatients(page, pageSize, searchTerm)
  }

  if (isLoading && patients.length === 0) {
    return <div className="text-center py-4"><Spin tip="Loading patients..." /></div>
  }


  if (error) {
    return (
      <div className="text-center py-4 text-red-600">
        {error}
        <Button onClick={() => fetchPatients(1, itemsPerPage, searchTerm)} className="ml-2">
          Retry
        </Button>
      </div>
    )
  }

  const columns = [
    {
      title: 'Name',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
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
      title: 'Sessions',
      key: 'sessions',
      render: (_: any, record: Patient) => (
        <span className="text-green-300">{(parseFloat(record.balance?.remainingSessions?.toFixed(2)) * 90) || 0}</span>
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag 
          color={
            status === "active" ? "green" : 
            status === "banned" ? "red" : "orange"
          }
        >
          {status}
        </Tag>
      ),
    },
    {
      title: 'Stripe Customer ID',
      key: 'stripeCustomerId',
      render: (_: any, record: Patient) => (
        <div className="flex items-center gap-2">
          {record.stripeCustomerId ? (
            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
              {record.stripeCustomerId}
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">Not found</span>
              <Button 
                size="small" 
                type="link" 
                onClick={() => handleRefreshCustomerId(record._id)}
                className="p-0 h-auto text-xs"
              >
                Refresh
              </Button>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Patient) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={() => handleViewDetails(record._id)}
          />
          <Dropdown
            overlay={
              <Menu>
                <Menu.Item 
                  key="manage-sessions" 
                  icon={<CreditCardOutlined />}
                  onClick={() => handleManageSessions(record)}
                >
                  Manage Sessions
                </Menu.Item>
                <Menu.Item 
                  key="change-therapist" 
                  icon={<UserSwitchOutlined />}
                  onClick={() => handleChangeTherapist(record)}
                >
                  Change Therapist
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
  Login as Patient
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
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ]

function DownloadPatientsButton() {
  const handleDownload = async () => {
    try {
      const res = await fetch("/api/admin/users/patients/imports");
      if (!res.ok) throw new Error("Failed to fetch vCard file");
      const blob = await res.blob();
      saveAs(blob, "icare-patients.vcf");
    } catch (error) {
      console.error(error);
      message.error("Failed to download contacts."); // Added error message
    }
  };

  return (
    <Button icon={<DownloadOutlined />} onClick={handleDownload} type="default">
      Download iPhone Contacts (BDL)
    </Button>
  );
}

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
  <div className="flex items-center gap-4">
    <Input
      placeholder="Search patients..."
      prefix={<SearchOutlined />}
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="flex-grow max-w-sm sm:max-w-xs"
    />
    <Checkbox
      checked={showOnlyWithBalance}
      onChange={(e) => setShowOnlyWithBalance(e.target.checked)}
    >
      balance
    </Checkbox>
  </div>
  <Space wrap>
    <Select
      value={itemsPerPage}
      onChange={setItemsPerPage}
      options={[
        { value: 5, label: '5 per page' },
        { value: 10, label: '10 per page' },
        { value: 20, label: '20 per page' },
        { value: 50, label: '50 per page' },
      ]}
      className="w-32"
    />
    <AddPatientDialog onSuccess={() => fetchPatients(1, itemsPerPage, searchTerm)} />
    <DownloadPatientsButton />
  </Space>
</div>

      <div className="overflow-x-auto">
      <Table
        columns={columns}
        dataSource={patients}
        rowKey="_id"
        pagination={false}
        loading={isLoading}
        locale={{
          emptyText: searchTerm ? "No patients found matching your search" : "No patients available"
        }}
      />
      </div>

      {pagination.totalPages > 1 && (
       <div className={`flex flex-wrap max-w-[80%] ${screens.md ? 'items-center justify-between' : 'flex-col gap-3 items-center'}`}>
           <div className="text-sm text-gray-500">
            Showing {(pagination.currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(pagination.currentPage * itemsPerPage, pagination.totalPatients)} of {pagination.totalPatients}{" "}
            Patients
          </div>
          <Pagination
            current={pagination.currentPage}
            total={pagination.totalPatients}
            pageSize={itemsPerPage}
            onChange={handlePageChange}
            showSizeChanger={false}
          />
        </div>
      )}

      {selectedPatient && (
        <>
          <EditPatientDialog
            patient={selectedPatient}
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            onSuccess={handleEditSuccess}
          />
          <ChangeTherapistDialog
            patient={selectedPatient}
            open={showTherapistDialog}
            onOpenChange={setShowTherapistDialog}
            onSuccess={handleTherapistChangeSuccess}
          />
      
          <BalanceManagementPopup
           visible={showSessionsDialog}
           onClose={() => setShowSessionsDialog(false)}
           patient={selectedPatient}
           onSuccess={() => fetchPatients(pagination.currentPage, itemsPerPage, searchTerm)}
          />
        </>
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
      />
    </Form.Item>
  </Form>
</Modal>
    </div>
  )
}
