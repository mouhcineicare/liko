"use client"

import React, { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { 
  Card, 
  Input, 
  Button, 
  Avatar, 
  Table, 
  Modal, 
  Dropdown, 
  Menu, 
  Switch, 
  Tag, 
  Tooltip,
  Spin,
  message,
  Form,
  Row,
  Col,
  Divider,
  Alert
} from "antd"
import { 
  UploadOutlined, 
  UserOutlined, 
  MoreOutlined, 
  DatabaseOutlined, 
  SyncOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  StopOutlined
} from "@ant-design/icons"
import type { MenuProps } from 'antd'

interface Admin {
  _id: string
  email: string
  fullName: string
  image: string
  status: string
}

interface Backup {
  _id: string
  startDate: string
  endDate?: string
  isStarted: boolean
  isCompleted: boolean
  status: "pending" | "in-progress" | "completed" | "failed"
  createdAt: string
  isScheduled: boolean
}

interface CronStatus {
  isRunning: boolean
  lastScheduledBackup: Backup | null
}

const { TextArea } = Input

export default function AdminSettings() {
  const { data: session, update } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingEmail, setIsLoadingEmail] = useState(false)
  const [isBackupLoading, setIsBackupLoading] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [admins, setAdmins] = useState<Admin[]>([])
  const [backups, setBackups] = useState<Backup[]>([])
  const [currentBackup, setCurrentBackup] = useState<Backup | null>(null)
  const [cronStatus, setCronStatus] = useState<CronStatus>({ isRunning: false, lastScheduledBackup: null })
  const [isScheduleEnabled, setIsScheduleEnabled] = useState(false)
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [newAdminImage, setNewAdminImage] = useState<string | null>(null)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)
  const [form] = Form.useForm()
  const [email, setEmail] = useState<string | null>(null)
  const [emailPassword, setEmailPassword] = useState<string>("");
  const [impersonationPasswordStatus, setImpersonationPasswordStatus] = useState<{
    isSet: boolean;
    lastUpdated?: string;
  }>({ isSet: false });

  // --- MIGRATION & URGENTS SECTION ---
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [markPaidLoading, setMarkPaidLoading] = useState(false);
  const [availabilityMigrationLoading, setAvailabilityMigrationLoading] = useState(false);
  const [paymentStatusUpdateLoading, setPaymentStatusUpdateLoading] = useState(false);
  const [therapistPaidMigrationLoading, setTherapistPaidMigrationLoading] = useState(false);
  const [therapistIdsMigrationLoading, setTherapistMigrationIdsLoading] = useState(false);

  const handleUpdateAppointmentsPaymentStatus = async () => {
  setPaymentStatusUpdateLoading(true);
  try {
    const res = await fetch("/api/admin/migrations/update-payment-status", { 
      method: "POST" 
    });
    const data = await res.json();
    if (res.ok) {
      message.success(data.message || `Updated ${data.updatedCount} appointments successfully`);
    } else {
      message.error(data.error || "Payment status update failed");
    }
  } catch (e) {
    message.error("Payment status update failed");
  } finally {
    setPaymentStatusUpdateLoading(false);
  }
};

  const handleMigrateAvailability = async () => {
    setAvailabilityMigrationLoading(true);
    try {
      const res = await fetch("/api/admin/migrations/availability", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        message.success(data.message || `Migrated ${data.migratedCount} profiles successfully`);
      } else {
        message.error(data.error || "Availability migration failed");
      }
    } catch (e) {
      message.error("Availability migration failed");
    } finally {
      setAvailabilityMigrationLoading(false);
    }
  };

  const handleMigrateTherapistPaid = async () => {
    setTherapistPaidMigrationLoading(true);
    try {
      const res = await fetch("/api/admin/migrations/appointments", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        message.success(data.message || `Migrated ${data.updatedCount} appointments to therapistPaid successfully`);
      } else {
        message.error(data.error || "TherapistPaid migration failed");
      }
    } catch (e) {
      message.error("TherapistPaid migration failed");
    } finally {
      setTherapistPaidMigrationLoading(false);
    }
  };
 const handleMigrateAllUsersModels = async() => {
  setTherapistMigrationIdsLoading(true);
  try {
      const response = await fetch('/api/admin/migrations/therapist-ids', {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        message.success(
          `Migration complete! ${result.stats.migratedCount} users updated. ${result.stats.errors} errors.`
        );
      } else {
        message.error(`Migration failed: ${result.error}`);
      }
    } catch (error) {
      message.error('Failed to start migration');
      console.error(error);
    } finally {
      setTherapistMigrationIdsLoading(false)
    }
  };

  useEffect(() => {
    const checkImpersonationPasswordStatus = async () => {
      try {
        const response = await fetch('/api/admin/impersonation');
        if (response.ok) {
          const data = await response.json();
          setImpersonationPasswordStatus({
            isSet: data.isSet,
            lastUpdated: data.lastUpdated
          });
        }
      } catch (error) {
        console.error('Error checking impersonation password status:', error);
      }
    };
  
    checkImpersonationPasswordStatus();
  }, []);

  useEffect(() => {
    fetchAdmins()
    fetchBackupStatus()

    const interval = setInterval(() => {
      fetchBackupStatus(false)
    }, 10000)

    setRefreshInterval(interval)

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [])

  useEffect(() => {
    if (cronStatus.lastScheduledBackup) {
      setIsScheduleEnabled(true)
    }
  }, [cronStatus])

  const fetchAdmins = async () => {
    try {
      const response = await fetch("/api/admin/users/admins")
      if (response.ok) {
        const data = await response.json()
        setAdmins(data)
      }
    } catch (error) {
      console.error("Error fetching admins:", error)
      message.error("Failed to load admin users")
    }
  }

  const fetchBackupStatus = async (showLoading = true) => {
    if (showLoading) {
      setIsBackupLoading(true)
    }

    try {
      const response = await fetch("/api/admin/backup")
      if (response.ok) {
        const data = await response.json()
        setBackups(data.backups)
        setCurrentBackup(data.currentBackup)
        setCronStatus(data.cronStatus)
      }
    } catch (error) {
      console.error("Error fetching backup status:", error)
      if (showLoading) {
        message.error("Failed to load backup status")
      }
    } finally {
      if (showLoading) {
        setIsBackupLoading(false)
      }
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isNewAdmin = false) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      message.error("Image size should be less than 5MB")
      return
    }

    try {
      setIsLoading(true)
      const compressedImage = await compressImage(file)

      if (isNewAdmin) {
        setNewAdminImage(compressedImage)
      } else {
        setProfileImage(compressedImage)

        const response = await fetch("/api/admin/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: compressedImage,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to update profile image")
        }

        window.location.reload()
        message.success("Profile image updated successfully")
      }
    } catch (error) {
      console.error("Error processing image:", error)
      message.error("Failed to update image")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailUpdate = async () => {
    setIsLoadingEmail(true);
    if (!email || !emailPassword) {
      message.error("Email and password are required");
      return;
    }

    try {
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!isValid) {
        message.error("Invalid email format");
        return;
      }

      const response = await fetch("/api/admin/email", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newEmail: email,
          currentPassword: emailPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update email");
      }

      message.success("Email updated successfully");
      setEmailPassword("");
    } catch (error: any) {
      message.error(error.message || "Failed to update email");
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const handlePasswordUpdate = async (values: any) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error("New passwords don't match")
      return
    }

    if (values.newPassword.length < 6) {
      message.error("Password must be at least 6 characters long")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/admin/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update password")
      }

      message.success("Password updated successfully")
      form.resetFields()
    } catch (error: any) {
      message.error(error.message || "Failed to update password")
    } finally {
      setIsLoading(false)
    }
  }

  

  const handleAddAdmin = async (values: any) => {
    setIsLoading(true)

    const data = {
      ...values,
      role: "admin",
      image: newAdminImage,
    }

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to create admin user")
      }

      message.success("Admin user created successfully")
      setShowAddAdmin(false)
      fetchAdmins()
      setNewAdminImage(null)
    } catch (error) {
      console.error("Error creating admin:", error)
      message.error("Failed to create admin user")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAdmin = async (adminId: string) => {
    Modal.confirm({
      title: "Are you sure you want to delete this admin user?",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          const response = await fetch(`/api/admin/users/${adminId}`, {
            method: "DELETE",
          })

          if (!response.ok) {
            throw new Error("Failed to delete admin user")
          }

          message.success("Admin user deleted successfully")
          fetchAdmins()
        } catch (error) {
          console.error("Error deleting admin:", error)
          message.error("Failed to delete admin user")
        }
      },
    })
  }

  const cancelBackup = async () => {
  setIsBackupLoading(true)
  try {
    const response = await fetch("/api/admin/backup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "stop" }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || "Failed to cancel backup")
    }

    message.success("Backup cancellation requested")
    fetchBackupStatus()
  } catch (error: any) {
    message.error(error.message || "Failed to cancel backup")
  } finally {
    setIsBackupLoading(false)
  }
}


  const startBackup = async () => {
    setIsBackupLoading(true)
    try {
      const response = await fetch("/api/admin/backup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "start" }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to start backup")
      }

      message.success("Backup process started successfully")
      fetchBackupStatus()
    } catch (error: any) {
      message.error(error.message || "Failed to start backup")
    } finally {
      setIsBackupLoading(false)
    }
  }

  const toggleSchedule = async () => {
    setIsBackupLoading(true)
    try {
      const action = isScheduleEnabled ? "stop" : "schedule"

      const response = await fetch("/api/admin/backup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${isScheduleEnabled ? "stop" : "schedule"} backup`)
      }

      setIsScheduleEnabled(!isScheduleEnabled)
      message.success(isScheduleEnabled ? "Scheduled backups disabled" : "Backups scheduled to run every 12 hours")
      fetchBackupStatus()
    } catch (error: any) {
      message.error(error.message || "Failed to update backup schedule")
    } finally {
      setIsBackupLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusBadge = (status: string, isScheduled = false) => {
    switch (status) {
      case "completed":
        return (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Completed
          </Tag>
        )
      case "in-progress":
        return (
          <Tag icon={<SyncOutlined spin />} color="processing">
            {isScheduled ? "Scheduled Backup Running" : "Manual Backup Running"}
          </Tag>
        )
      case "failed":
        return (
          <Tag icon={<CloseCircleOutlined />} color="error">
            Failed
          </Tag>
        )
      default:
        return (
          <Tag icon={<ClockCircleOutlined />} color="default">
            Pending
          </Tag>
        )
    }
  }

  const getBackupTypeIcon = (isScheduled: boolean) => {
    return isScheduled ? (
      <Tooltip title="Scheduled Backup">
        <CalendarOutlined style={{ color: "#1890ff" }} />
      </Tooltip>
    ) : (
      <Tooltip title="Manual Backup">
        <DatabaseOutlined style={{ color: "#722ed1" }} />
      </Tooltip>
    )
  }

  const items: MenuProps['items'] = [
    {
      key: '1',
      label: 'Delete',
      danger: true,
      onClick: (info) => {
        const adminId = info.domEvent.currentTarget.getAttribute('data-adminid')
        if (adminId) handleDeleteAdmin(adminId)
      }
    }
  ]

  const handleMigrateSessions = async () => {
    setMigrationLoading(true);
    try {
      const res = await fetch("/api/admin/migrations/sessions", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        message.success(data.message || "Migration completed successfully");
      } else {
        message.error(data.error || "Migration failed");
      }
    } catch (e) {
      message.error("Migration failed");
    } finally {
      setMigrationLoading(false);
    }
  };

  const handleRollbackSessions = async () => {
    setRollbackLoading(true);
    try {
      const res = await fetch("/api/admin/migrations/sessions?rollback=1", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        message.success(data.message || "Rollback completed successfully");
      } else {
        message.error(data.error || "Rollback failed");
      }
    } catch (e) {
      message.error("Rollback failed");
    } finally {
      setRollbackLoading(false);
    }
  };

    const handleMarkPaidSessions = async () => {
    setMarkPaidLoading(true);
    try {
      const res = await fetch("/api/admin/migrations/mark-sessions-paid", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        message.success(data.message || `Marked ${data.updated} appointments successfully`);
      } else {
        message.error(data.error || "Marking paid sessions failed");
      }
    } catch (e) {
      message.error("Marking paid sessions failed");
    } finally {
      setMarkPaidLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>Admin Settings</h1>

      <Row gutter={[16, 16]}>
        {/* Profile Settings */}
        <Col xs={24} md={12}>
          <Card title="Profile Settings" bordered={false}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
              <Avatar 
                size={80} 
                src={profileImage || session?.user?.image} 
                icon={<UserOutlined />}
              />
              <div style={{ marginLeft: 16 }}>
                <Button>
                  <label htmlFor="profileImageUpload" style={{ cursor: 'pointer' }}>
                    <UploadOutlined /> Upload Photo
                  </label>
                  <input
                    id="profileImageUpload"
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                    accept="image/*"
                  />
                </Button>
                <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12, marginTop: 8 }}>
                  JPG, PNG or GIF. Max size of 5MB.
                </div>
              </div>
            </div>

            <Form
              layout="vertical"
              onFinish={handlePasswordUpdate}
              initialValues={{
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
              }}
            >
              <Form.Item
                label="Current Password"
                name="currentPassword"
                rules={[{ required: true, message: 'Please input your current password!' }]}
              >
                <Input.Password />
              </Form.Item>

              <Form.Item
                label="New Password"
                name="newPassword"
                rules={[{ required: true, message: 'Please input your new password!' }]}
              >
                <Input.Password />
              </Form.Item>

              <Form.Item
                label="Confirm New Password"
                name="confirmPassword"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Please confirm your new password!' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve()
                      }
                      return Promise.reject('The two passwords do not match!')
                    },
                  }),
                ]}
              >
                <Input.Password />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={isLoading}>
                  Update Password
                </Button>
              </Form.Item>
            </Form>

            <Form layout="vertical" onFinish={handleEmailUpdate}>
              <Form.Item
                label="New Email"
                name="email"
                rules={[
                  { required: true, message: "Please input your new email!" },
                  { type: "email", message: "Please input a valid email!" },
                ]}
              >
                <Input
                  type="email"
                  placeholder="Enter new email"
                  value={email || session?.user?.email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Form.Item>

              <Form.Item
                label="Confirm Password"
                name="emailPassword"
                rules={[{ required: true, message: "Please input your password!" }]}
              >
                <Input.Password
                  placeholder="Enter your password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isLoadingEmail}
                >
                  Update Email
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Database Backup */}
        <Col xs={24} md={12}>
          <Card title="Database Backup" bordered={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>Backup Operations</div>
                  <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12 }}>
                    Create a backup of all database collections
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Switch
                    checked={isScheduleEnabled}
                    onChange={toggleSchedule}
                    disabled={isBackupLoading || !!currentBackup}
                    checkedChildren={<CalendarOutlined />}
                    unCheckedChildren={<CalendarOutlined />}
                  />
                  <Button
                    type="primary"
                    onClick={startBackup}
                    disabled={isBackupLoading || !!currentBackup}
                    icon={<DatabaseOutlined />}
                    loading={isBackupLoading}
                  >
                    {currentBackup ? 'Backup in Progress' : 'Start Manual Backup'}
                  </Button>
                  <Button
                       danger
                       onClick={cancelBackup}
                       disabled={isBackupLoading || currentBackup?.isScheduled}
                      icon={<StopOutlined />}
                    >
                        Cancel Backup
                   </Button>
                </div>
              </div>

              {(currentBackup || cronStatus?.isRunning) && (
                <div style={{ 
                  padding: 12,
                  backgroundColor: '#e6f7ff',
                  border: '1px solid #91d5ff',
                  borderRadius: 4
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <SyncOutlined spin style={{ color: '#1890ff', marginRight: 8 }} />
                    <span style={{ color: '#1890ff' }}>Backup in Progress</span>
                  </div>
                  <div style={{ color: '#1890ff', fontSize: 12, marginTop: 4 }}>
                    {currentBackup?.isScheduled
                      ? "A scheduled backup is currently running. Please wait for it to complete."
                      : "A manual backup is currently running. Please wait for it to complete."}
                  </div>
                  {currentBackup && (
                    <div style={{ color: '#1890ff', fontSize: 12, marginTop: 4 }}>
                      Started at: {formatDate(currentBackup.startDate)}
                    </div>
                  )}
                </div>
              )}

              <Table
                dataSource={backups}
                rowKey="_id"
                pagination={false}
                scroll={{ x: true }}
                locale={{ emptyText: 'No backup history found' }}
              >
                <Table.Column 
                  title="Type" 
                  dataIndex="isScheduled" 
                  key="type"
                  render={(isScheduled) => getBackupTypeIcon(isScheduled)}
                  width={80}
                />
                <Table.Column 
                  title="Date" 
                  dataIndex="createdAt" 
                  key="date"
                  render={(date) => formatDate(date)}
                />
                <Table.Column 
                  title="Status" 
                  dataIndex="status" 
                  key="status"
                  render={(status, record: Backup) => getStatusBadge(status, record.isScheduled)}
                />
                <Table.Column 
                  title="Start Time" 
                  dataIndex="startDate" 
                  key="startDate"
                  render={(date) => formatDate(date)}
                />
                <Table.Column 
                  title="End Time" 
                  dataIndex="endDate" 
                  key="endDate"
                  render={(date) => date ? formatDate(date) : '-'}
                />
              </Table>

              <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12 }}>
                <div><CalendarOutlined /> Scheduled backups run automatically every 12 hours</div>
                <div><DatabaseOutlined /> Manual backups are triggered by an administrator</div>
              </div>
            </div>
          </Card>
        </Col>

        {/* ------------ */}

  
<Col xs={24} md={24}>
  <Card title="Impersonation Password Settings" bordered={false}>
  <Alert
  message="Impersonation Password Info"
  description={
    <>
      <p>This password is used exclusively for admin impersonation features. It must be different from your admin login password.</p>
      <p>
        <strong>Status:</strong> {impersonationPasswordStatus.isSet ? (
          <Tag color="green">Configured {impersonationPasswordStatus.lastUpdated && `(Last updated: ${new Date(impersonationPasswordStatus.lastUpdated).toLocaleString()})`}</Tag>
        ) : (
          <Tag color="orange">Not Configured</Tag>
        )}
      </p>
    </>
  }
  type="info"
  showIcon
  style={{ marginBottom: 16 }}
/>
    <Form
      layout="vertical"
      onFinish={async (values) => {
        try {
          setIsLoading(true);
          const response = await fetch('/api/admin/impersonation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              currentPassword: values.currentAdminPassword,
              newPassword: values.newImpersonationPassword,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to update impersonation password');
          }

          message.success('Impersonation password updated successfully');
          form.resetFields();
        } catch (error) {
          console.error('Error updating impersonation password:', error);
          message.error(error instanceof Error ? error.message : 'Failed to update password');
        } finally {
          setIsLoading(false);
        }
      }}
    >
      <Form.Item
        label="Current Admin Password"
        name="currentAdminPassword"
        rules={[{ required: true, message: 'Please input your current admin password!' }]}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item
        label="New Impersonation Password"
        name="newImpersonationPassword"
        rules={[
          { required: true, message: 'Please input the new impersonation password!' },
          { min: 8, message: 'Password must be at least 8 characters!' }
        ]}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item
        label="Confirm New Impersonation Password"
        name="confirmImpersonationPassword"
        dependencies={['newImpersonationPassword']}
        rules={[
          { required: true, message: 'Please confirm the new password!' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('newImpersonationPassword') === value) {
                return Promise.resolve();
              }
              return Promise.reject('The two passwords do not match!');
            },
          }),
        ]}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={isLoading}>
          Update Impersonation Password
        </Button>
      </Form.Item>
    </Form>
  </Card>
</Col>

        {/* Manage Admins */}
        <Col xs={24}>
          <Card 
            title="Manage Admins" 
            bordered={false}
            extra={
              <Button type="primary" onClick={() => setShowAddAdmin(true)}>
                Add Admin
              </Button>
            }
          >
            <Table
              dataSource={admins}
              rowKey="_id"
              pagination={false}
              scroll={{ x: true }}
            >
              <Table.Column 
                title="Admin" 
                dataIndex="fullName" 
                key="name"
                render={(text, record: Admin) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar src={record.image} icon={<UserOutlined />} />
                    <span>{text}</span>
                  </div>
                )}
              />
              <Table.Column title="Email" dataIndex="email" key="email" />
              <Table.Column 
                title="Status" 
                dataIndex="status" 
                key="status"
                render={(status) => (
                  <Tag color={status === 'active' ? 'success' : 'default'}>{status}</Tag>
                )}
              />
              <Table.Column 
                title="Actions" 
                key="actions"
                render={(_, record: Admin) => (
                  <Dropdown menu={{ items }} trigger={['click']}>
                    <Button type="text" icon={<MoreOutlined />} />
                  </Dropdown>
                )}
                fixed="right"
                width={80}
              />
            </Table>
          </Card>
        </Col>
      </Row>

      {/* Migration & Urgents Section */}
<Divider orientation="left" style={{ marginTop: 40 }}>
  <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
  Migration & Urgents
</Divider>
<Card style={{ marginBottom: 32 }}>
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <Button
      type="primary"
      danger
      loading={migrationLoading}
      onClick={handleMigrateSessions}
    >
      Migrate to new sessions (updated New)
    </Button>
    {/* <Button
      disabled
      type="default"
      loading={rollbackLoading}
      onClick={handleRollbackSessions}
    >
      Rollback the session change (disabled)
    </Button> */}
    {/* <Button
      type="dashed"
      loading={markPaidLoading}
      onClick={handleMarkPaidSessions}
      disabled
    >
      Mark sessions as paid
    </Button> */}
    {/* <Button
      type="primary"
      loading={availabilityMigrationLoading}
      onClick={handleMigrateAvailability}
    >
      Migrate Availability Format
    </Button> */}
    <Button
  type="primary"
  loading={paymentStatusUpdateLoading}
  onClick={handleUpdateAppointmentsPaymentStatus}
>
  Update All unpaid appointments from stripe (new / not used yet)
</Button>
    <Button
      type="primary"
      loading={therapistPaidMigrationLoading}
      onClick={handleMigrateTherapistPaid}
    >
      Migrate therapistPaid from isPaid (new)
    </Button>
    <Button
      type="primary"
      loading={therapistIdsMigrationLoading}
      onClick={handleMigrateAllUsersModels}
    >
      Migrate All Therapists ids to object Ids in Users Model (new)
    </Button>
    <div style={{ color: '#faad14', fontSize: 13 }}>
      <b>Note:</b> These actions affect all appointments with recurring sessions. Use with caution.
    </div>
  </div>
</Card>

      {/* Add Admin Modal */}
      <Modal
        title="Add New Admin"
        open={showAddAdmin}
        onCancel={() => setShowAddAdmin(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          layout="vertical"
          onFinish={handleAddAdmin}
          form={form}
        >
          <Form.Item
            label="Full Name"
            name="fullName"
            rules={[{ required: true, message: 'Please input the full name!' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please input the email!' },
              { type: 'email', message: 'Please input a valid email!' }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: 'Please input the password!' },
              { min: 6, message: 'Password must be at least 6 characters!' }
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item label="Profile Image">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Avatar size={64} src={newAdminImage} icon={<UserOutlined />} />
              <Button>
                <label htmlFor="adminImageUpload" style={{ cursor: 'pointer' }}>
                  <UploadOutlined /> Upload Photo
                </label>
                <input
                  id="adminImageUpload"
                  type="file"
                  style={{ display: 'none' }}
                  onChange={(e) => handleImageUpload(e, true)}
                  accept="image/*"
                />
              </Button>
            </div>
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => setShowAddAdmin(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={isLoading}>
                Add Admin
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// Add this utility function if not already present
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const MAX_WIDTH = 800
        const MAX_HEIGHT = 800
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height
        ctx?.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
    }
  })
}