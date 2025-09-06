// pages/payments.tsx
'use client';

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { 
  Card, 
  Tabs, 
  Table, 
  Spin, 
  Tag,
  Button,
  Statistic,
  Row,
  Col,
  Descriptions,
  Typography
} from "antd";
import { 
  DollarOutlined,
  DownOutlined,
  UpOutlined,
  UserOutlined,
  CalendarOutlined,
  CreditCardOutlined 
} from "@ant-design/icons";
import { toast } from "sonner";
import { format } from "date-fns";

const { Text } = Typography;
const { TabPane } = Tabs;

interface SessionPaid {
  _id?: string;
  sessionIndex?: number;
  amount: number;
  date?: string;
  appointmentId?: string;
}

interface Payment {
  _id: string;
  amount: number;
  status: string;
  paidAt: string;
  paymentMethod: string;
  transactionId?: string;
  appointments: Array<{
    _id: string;
    date: string;
    price: number;
    plan: string;
    therapyType: string;
    patient: {
      _id: string;
      fullName: string;
      email: string;
    };
    recurring?: Array<{
      date: string;
      status: string;
      payment: string;
      index: number;
    }>;
    sessionsPaid: SessionPaid[];
  }>;
}

interface PendingAppointment {
  _id: string;
  date: string;
  price: number;
  plan: string;
  therapyType: string;
  patient: {
    _id: string;
    fullName: string;
    email: string;
  };
  recurring?: Array<{
    date: string;
    status: string;
    payment: string;
    index: number;
  }>;
  completedSessions: number;
  payoutStatus: string;
}

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState("history");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointment[]>([]);
  const [expandedPayments, setExpandedPayments] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Calculate totals
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalPending = pendingAppointments.reduce((sum, apt) => {
    // For single sessions, use full price if not paid
    if (!apt.recurring || apt.recurring.length === 0) {
      return apt.payoutStatus !== 'paid' ? sum + apt.price : sum;
    }
    // For recurring, sum unpaid completed sessions
    return sum + (apt.recurring
      .filter(s => s.status === 'completed' && s.payment !== 'paid')
      .reduce((sessionSum, _) => sessionSum + (apt.price / apt.recurring!.length), 0));
  }, 0);
  
  const pendingAppointmentsCount = pendingAppointments.length;
  const completedAppointmentsCount = payments.reduce(
    (sum, payment) => sum + payment.appointments.length, 
    0
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchPayments(),
        fetchPendingAppointments()
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    const response = await fetch("/api/therapist/payments");
    if (response.ok) {
      const data = await response.json();
      setPayments(data);
    } else {
      toast.error("Failed to fetch payment history");
    }
  };

  const fetchPendingAppointments = async () => {
    const response = await fetch("/api/therapist/appointments/completed-unpaid");
    if (response.ok) {
      const data = await response.json();
      setPendingAppointments(data);
    } else {
      toast.error("Failed to fetch pending appointments");
    }
  };

  const togglePaymentDetails = (paymentId: string) => {
    setExpandedPayments(prev => ({
      ...prev,
      [paymentId]: !prev[paymentId]
    }));
  };

  const paymentHistoryColumns = [
    {
      title: 'Payment Date',
      dataIndex: 'paidAt',
      key: 'paidAt',
      render: (date: string) => format(new Date(date), "PPp"),
    },
   {
    title: 'Amount',
    dataIndex: 'amount',
    key: 'amount',
    render: (amount: number, record: Payment) => {
      // Convert amount based on payment method
      const formattedAmount = amount.toFixed(2);
      
      switch (record.paymentMethod.toLowerCase()) {
        case 'stripe':
        case 'manual':
          return `AED ${formattedAmount}`;
        case 'usdc':
          return `USDC ${formattedAmount}`;
        case 'usdt':
          return `USDT ${formattedAmount}`;
        default:
          return `${record.paymentMethod.toUpperCase()} ${formattedAmount}`;
      }
    },
  },
    {
      title: 'Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method: string) => (
        <Tag color={method === 'stripe' ? 'blue' : method === 'usdt' ? 'purple' : 'orange'}>
          {method.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'completed' ? 'green' : status === 'failed' ? 'red' : 'orange'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
  ];

  const pendingPaymentsColumns = [
    {
      title: 'Patient',
      dataIndex: 'patient',
      key: 'patient',
      render: (patient: any) => patient.fullName,
    },
    {
      title: 'Session Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => format(new Date(date), "PPp"),
    },
    {
      title: 'Plan',
      dataIndex: 'plan',
      key: 'plan',
    },
    {
      title: 'Amount Due',
      key: 'amountDue',
      render: (_: any, record: PendingAppointment) => {
        if (!record.recurring || record.recurring.length === 0) {
          return `د.إ${record.price.toFixed(2)}`;
        }
        const unpaidSessions = record.recurring
          .filter(s => s.status === 'completed' && s.payment !== 'paid')
          .length;
        const sessionPrice = record.price / record.recurring.length;
        return `د.إ${(unpaidSessions * sessionPrice).toFixed(2)}`;
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: PendingAppointment) => (
        <Tag color={record.payoutStatus === 'paid' ? 'green' : 'orange'}>
          {record.payoutStatus === 'paid' ? 'Paid' : 
           record.payoutStatus === 'pending_payout' ? 'Processing' : 'Pending'}
        </Tag>
      ),
    },
  ];

const renderPaymentDetails = (payment: Payment) => {
  return (
    <div className="p-4 bg-gray-50">
      {payment.appointments.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          No appointment details available for this payment
        </div>
      ) : (
        payment.appointments.map(apt => {
          const isFullPayment = apt.sessionsPaid.some(s => s.sessionIndex === 0);
          const totalPaidForAppointment = apt.sessionsPaid.reduce((sum, s) => sum + s.amount, 0);
          const totalSessions = apt.recurring?.length || 1;
          const sessionPrice = apt.price / totalSessions;

          return (
            <Card 
              key={apt._id} 
              className="mb-4"
              title={
                <div className="flex justify-between items-center">
                  <span>
                    <UserOutlined className="mr-2" />
                    {apt.patient?.fullName || 'Unknown Patient'}
                  </span>
                  <div>
                    <Tag color="blue" className="mr-2">{apt.therapyType || 'Unknown'}</Tag>
                    <Tag color={isFullPayment ? 'green' : 'cyan'}>
                      {isFullPayment ? 'Full Payment' : `${apt.sessionsPaid.length} Session${apt.sessionsPaid.length > 1 ? 's' : ''} Paid`}
                    </Tag>
                  </div>
                </div>
              }
              extra={
                <div className="flex items-center">
                  <span className="font-semibold mr-2">Total:</span>
                  <span className="font-bold">د.إ{totalPaidForAppointment.toFixed(2)}</span>
                </div>
              }
            >
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="Patient Email">
                  {apt.patient?.email || 'No email available'}
                </Descriptions.Item>
                
                <Descriptions.Item label="Plan">
                  {apt.plan || 'Unknown'} ({isFullPayment ? 'Single session' : `${totalSessions} sessions`})
                </Descriptions.Item>
                
                {isFullPayment ? (
                  <Descriptions.Item label="Payment Details">
                    <div className="flex justify-between items-center">
                      <div>
                        <CreditCardOutlined className="mr-2" />
                        <span>Full appointment payment</span>
                      </div>
                      <span className="font-medium">د.إ{apt.price?.toFixed(2) || '0.00'}</span>
                    </div>
                  </Descriptions.Item>
                ) : (
                  <>
                    <Descriptions.Item label="Paid Sessions">
                      <div className="space-y-2">
                        {apt.sessionsPaid.map((session, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <div>
                              <CalendarOutlined className="mr-2" />
                              <span className="font-medium">
                                Session {(session?.sessionIndex || 0) + 1}
                              </span>
                              <div className="text-xs text-gray-500">
                                {format(new Date(session.date || apt.date), "PPp")}
                              </div>
                            </div>
                            <span className="font-medium">د.إ{session.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </Descriptions.Item>
                    <Descriptions.Item label="Price Breakdown">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex justify-between">
                          <span>Price per session:</span>
                          <span>د.إ{sessionPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sessions paid:</span>
                          <span>{apt.sessionsPaid.length}/{totalSessions}</span>
                        </div>
                      </div>
                    </Descriptions.Item>
                  </>
                )}
              </Descriptions>
            </Card>
          );
        })
      )}
    </div>
  );
};

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Payments</h1>

      <Spin spinning={loading}>
        {/* Stats Cards */}
        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Paid"
                value={totalPaid}
                precision={2}
                valueStyle={{ color: '#3f8600' }}
                prefix={<DollarOutlined />}
                suffix="د.إ"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Pending Amount"
                value={totalPending}
                precision={2}
                valueStyle={{ color: '#faad14' }}
                prefix={<DollarOutlined />}
                suffix="د.إ"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Pending Sessions"
                value={pendingAppointmentsCount}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Sessions"
                value={completedAppointmentsCount}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Tabs Section */}
        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="Paid Sessions" key="history">
              <Table
                columns={paymentHistoryColumns}
                dataSource={payments}
                rowKey="_id"
                expandable={{
                  expandedRowRender: renderPaymentDetails,
                  rowExpandable: (record: Payment) => true,
                  expandRowByClick: true,
                  expandedRowKeys: Object.keys(expandedPayments).filter(key => expandedPayments[key]),
                  onExpand: (expanded, record) => togglePaymentDetails(record._id)
                }}
                locale={{ emptyText: 'No payment history available' }}
              />
            </TabPane>
            <TabPane tab="Upcoming Payments" key="pending">
              <Table
                columns={pendingPaymentsColumns}
                dataSource={pendingAppointments}
                rowKey="_id"
                expandable={{
                  expandedRowRender: (record: PendingAppointment) => (
                    <div className="p-4 bg-gray-50">
                      <Descriptions bordered size="small" column={1}>
                        <Descriptions.Item label="Patient Email">
                          {record.patient?.email || 'No email available'}
                        </Descriptions.Item>
                        {record.recurring && record.recurring.length > 0 ? (
                          <>
                            <Descriptions.Item label="Unpaid Sessions">
                              <div className="space-y-2">
                                {record.recurring
                                  .filter(s => s.status === 'completed' && s.payment !== 'paid')
                                  .map((session, idx) => (
                                    <div key={idx} className="flex justify-between">
                                      <span>
                                        <CalendarOutlined className="mr-2" />
                                        Session {session.index + 1} - {format(new Date(session.date), "PPp")}
                                      </span>
                                      <span>
                                        د.إ{(record.price / record.recurring!.length).toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </Descriptions.Item>
                            <Descriptions.Item label="Total Due">
                              د.إ{(
                                record.recurring
                                  .filter(s => s.status === 'completed' && s.payment !== 'paid')
                                  .length * 
                                (record.price / record.recurring.length)
                              ).toFixed(2)}
                            </Descriptions.Item>
                          </>
                        ) : (
                          <Descriptions.Item label="Full Amount Due">
                            د.إ{record.price?.toFixed(2) || '0.00'}
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    </div>
                  ),
                  rowExpandable: () => true
                }}
                locale={{ emptyText: 'No pending payments' }}
              />
            </TabPane>
          </Tabs>
        </Card>
      </Spin>
    </div>
  );
}