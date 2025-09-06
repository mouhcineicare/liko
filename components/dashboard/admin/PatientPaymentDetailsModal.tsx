// components/dashboard/admin/PatientPaymentDetailsModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Modal, Tabs, Table, Tag, Spin, message, Typography, Space } from "antd";
import { 
  DollarOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { Text } = Typography;

interface PatientPayment {
  id: string;
  type: string;
  amount: number;
  currency: string;
  created: number;
  description: string;
  metadata: Record<string, any>;
  receipt_url: string | null;
}

interface AppointmentSession {
  _id: string;
  date: string;
  price: number;
  status: string;
  paymentStatus: string;
  isPaid: boolean;
  adjustedPrice?: number;
  index?: number;
}

interface Appointment {
  _id: string;
  date: string;
  price: number;
  plan: string;
  status: string;
  patient: {
    _id: string;
    fullName: string;
    email: string;
  };
  paymentStatus: string;
  totalSessions: number;
  sessions: AppointmentSession[];
}

export default function PatientPaymentDetailsModal({
  email,
  open,
  onClose,
}: {
  email: string;
  open: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState("payments");
  const [payments, setPayments] = useState<PatientPayment[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && email) {
      fetchPatientData();
    }
  }, [open, email]);

  const fetchPatientData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/payments/patient?email=${email}`);
      if (!response.ok) throw new Error("Failed to fetch patient data");
      
      const data = await response.json();
      setPayments(data.payments || []);
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error("Error fetching patient data:", error);
      message.error("Failed to load patient payment and session data");
    } finally {
      setLoading(false);
    }
  };

 const paymentColumns = [
  {
    title: 'Date',
    dataIndex: 'created',
    key: 'created',
    render: (timestamp: number) =>
      dayjs(timestamp * 1000).format('MMM D, YYYY h:mm A')
  },
  {
    title: 'Amount',
    dataIndex: 'amount',
    key: 'amount',
    render: (amount: number, record: PatientPayment) => (
      <Text strong>
        {(amount / 100).toLocaleString('en-US', {
          style: 'currency',
          currency: record.currency.toUpperCase()
        })}
      </Text>
    )
  },
  {
    title: 'Type',
    dataIndex: 'type',
    key: 'type',
    render: (type: string) => (
      <Tag color="blue">{type.replace('_', ' ').toUpperCase()}</Tag>
    )
  },
  {
    title: 'Description',
    dataIndex: 'description',
    key: 'description',
    render: (desc: string) => desc || 'N/A'
  },
  {
    title: 'Receipt',
    dataIndex: 'receipt_url',
    key: 'receipt_url',
    render: (url: string | null) =>
      url ? <a href={url} target="_blank" rel="noopener noreferrer">View</a> : '-'
  }
];


  const sessionColumns = [
    {
      title: 'Appointment',
      dataIndex: 'plan',
      key: 'plan',
      render: (plan: string, record: Appointment) => (
        <Text strong>{plan}</Text>
      )
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('MMM D, YYYY h:mm A')
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'completed' ? 'green' : 'blue'}>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Payment Status',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (status: string) => (
        <Tag color={status === 'completed' ? 'green' : 'orange'}>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => (
        <Text strong>AED {price.toFixed(2)}</Text>
      )
    }
  ];

  const renderSessionDetails = (appointment: Appointment) => {
    return (
      <div style={{ marginTop: 16 }}>
        <Text strong>Sessions:</Text>
        <div style={{ marginTop: 8 }}>
          {appointment.sessions?.map(session => (
            <div key={session._id} style={{ 
              padding: 8, 
              marginBottom: 8, 
              backgroundColor: '#f5f5f5',
              borderRadius: 4
            }}>
              <Space>
                <Text>{dayjs(session.date).format('MMM D, YYYY h:mm A')}</Text>
                <Tag color={session.status === 'completed' ? 'green' : 'blue'}>
                  {session.status.toUpperCase()}
                </Tag>
                <Tag color={session.paymentStatus === 'completed' ? 'green' : 'orange'}>
                  {session.paymentStatus.toUpperCase()}
                </Tag>
                <Text strong>AED {session.price.toFixed(2)}</Text>
              </Space>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Modal
      title={`Patient Payment Details`}
      open={open}
      onCancel={onClose}
      width={800}
      footer={null}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane
          tab={
            <span>
              <DollarOutlined /> Payments ({payments.length})
            </span>
          }
          key="payments"
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Spin tip="Loading payments..." />
            </div>
          ) : (
            <Table
              columns={paymentColumns}
              dataSource={payments}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 5 }}
              locale={{ emptyText: 'No payment records found' }}
            />
          )}
        </TabPane>
        <TabPane
          tab={
            <span>
              <CalendarOutlined /> Sessions ({appointments.length})
            </span>
          }
          key="sessions"
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Spin tip="Loading sessions..." />
            </div>
          ) : (
            <Table
              columns={sessionColumns}
              dataSource={appointments}
              rowKey="_id"
              size="small"
              pagination={{ pageSize: 5 }}
              expandable={{
                expandedRowRender: renderSessionDetails
              }}
              locale={{ emptyText: 'No session records found' }}
            />
          )}
        </TabPane>
      </Tabs>
    </Modal>
  );
}