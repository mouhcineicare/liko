"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Card, 
  Tabs, 
  Table,
  Button, 
  Tag, 
  Spin, 
  message,
  Statistic,
  Divider,
  Collapse,
  Space,
  Typography,
  Grid,
  Modal,
  Tooltip
} from 'antd';
import { 
  DollarOutlined,
  DownOutlined,
  UpOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  SyncOutlined,
  EditOutlined,
  DeleteOutlined,
  CreditCardOutlined,
  LinkOutlined,
  StopOutlined,
  EllipsisOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import PaymentDialog from "@/components/dashboard/admin/PaymentDialog";
import AddPaymentDialog from "@/components/dashboard/admin/AddPaymentDialog";
import StripePaymentsTable from '@/components/dashboard/admin/StripePaymentsTable';
import { SessionManagementModal } from '@/components/shared/SessionManagementModal';
import PatientPaymentDetailsModal from "@/components/dashboard/admin/PatientPaymentDetailsModal";
import LinkPaymentModal from "@/components/dashboard/admin/PaymentLinkModal";
import { Dropdown } from "antd";

const { TabPane } = Tabs;
const { Text } = Typography;
const { useBreakpoint } = Grid;

interface AppointmentSession {
  _id: string;
  appointmentId: string;
  date: string;
  price: number;
  status: 'in_progress' | 'completed';
  paymentStatus: 'not_paid' | 'paid' | 'completed';
  isPaid: boolean;
  adjustedPrice?: number;
  index: number;
  patientName: string;
  patientId?: string;
  appointmentType?: string;
  therapistLevel?: number;
  paidAt?: string;
  isCurrent?: boolean;
  stripeVerified?: boolean;
  isMain?: boolean;
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
    customerId: string;
  };
  paymentPercentage: number;
  adjustedPrice?: number;
  paymentStatus: string;
  completedSessions?: number;
  totalSessions: number;
  recurring?: string[] | { date: string; status: string; payment: string; index?: number }[];
  sessions: AppointmentSession[];
  therapist: {
    _id: string;
    level: number;
  };
  therapistWalletAddress?: string;
  therapistPaid?: boolean;
  stripeVerified?: boolean;
  checkoutSessionId?: string;
  stripeSubscriptionStatus: string;
  isStripeActive: boolean;
  isPayoutRejected?: boolean;
  rejectedPayoutNote?: string;
}

interface TherapistPayment {
  therapistId: string;
  therapistName: string;
  therapistEmail: string;
  totalAmount: number;
  appointmentCount: number;
  appointments: Appointment[];
  therapistLevel: number;
}

interface PaymentSummary {
  summaries: Array<{
    therapistId: string;
    therapistName: string;
    pendingAmount: number;
    paidAmount: number;
    appointmentCount: number;
  }>;
  totalPending: number;
  totalAppointments: {
    amount: number;
    count: number;
  };
}

interface PaymentHistory {
  _id: string;
  therapist: {
    _id: string;
    fullName: string;
    email: string;
  };
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  cryptoAddress?: string;
  manualNote?: string;
  sessions: Array<{
    _id: string;
    date: string;
    status: 'in_progress' | 'completed';
    paymentStatus: 'not_paid' | 'paid';
    price?: number;
    index?: number;
    isPaid?: boolean;
    paidAt?: string;
    isCurrent?: boolean;
    appointmentId: string;
    patientName: string;
  }>;
  appointments: Array<{
    _id: string;
    date: string;
    price: number;
    plan: string;
    status: string;
    patient?: { 
        _id: string;
        fullName: string;
        email?: string;
    };
    isPaid?: boolean;
  }>;
  status: string;
  paidAt: string;
  createdAt: string;
  sessionsHistory: any[];
}

interface PatientPayment {
  id: string;
  created: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  receipt_url?: string;
}

export default function PaymentsPage() {
  // Payout rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingAppointment, setRejectingAppointment] = useState<Appointment | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [showLinkPaymentModal, setShowLinkPaymentModal] = useState(false);
  const [selectedAppointmentForPayment, setSelectedAppointmentForPayment] = useState<Appointment | null>(null);
  const [linkingPaymentId, setLinkingPaymentId] = useState<string | null>(null);

  // Suggested quick notes for rejection
  const quickRejectNotes = [
    'Rejected: Payment not verified or not received.',
    'Admin requests direct contact regarding this appointment.',
    'Please contact us to discuss this appointment.'
  ];

  const handleRejectPayout = (appointment: Appointment) => {
    setRejectingAppointment(appointment);
    setRejectNote('');
    setShowRejectModal(true);
  };

  const handleLinkPayment = async (appointmentId: string, paymentId: string) => {
  setLinkingPaymentId(appointmentId);
  try {
    const response = await fetch(`/api/admin/appointments/${appointmentId}/link-payment`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to link payment');
    }

    message.success('Payment linked successfully');
    fetchPayments(); // Refresh the payments data
    setShowLinkPaymentModal(false);
  } catch (error: any) {
    console.error('Error linking payment:', error);
    message.error(error.message || 'Failed to link payment');
  } finally {
    setLinkingPaymentId(null);
  }
};

  const submitRejectPayout = async () => {
    if (!rejectingAppointment) return;
    try {
      const response = await fetch(`/api/admin/payments/${rejectingAppointment._id}/reject-payout`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: rejectNote })
      });
      if (!response.ok) throw new Error('Failed to reject payout');
      message.success('Payout rejected and note saved');
      setShowRejectModal(false);
      setRejectingAppointment(null);
      setRejectNote('');
      fetchPayments();
    } catch (error: any) {
      message.error(error.message);
    }
  };
  const [activeTab, setActiveTab] = useState("pending");
  const [pendingPayments, setPendingPayments] = useState<TherapistPayment[]>([]);
  const [availablePayments, setAvailablePayments] = useState<TherapistPayment[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [expandedTherapist, setExpandedTherapist] = useState<string | null>(null); 
  const [expandedHistoryPayment, setExpandedHistoryPayment] = useState<string | null>(null); 
  const [paymentData, setPaymentData] = useState<PaymentSummary>({
    summaries: [],
    totalPending: 0,
    totalAppointments: {
      amount: 0,
      count: 0
    }
  });
  const [selectedTherapist, setSelectedTherapist] = useState<TherapistPayment | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPatientPayments, setShowPatientPayments] = useState(false);
  const [patientPayments, setPatientPayments] = useState<PatientPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showSessionManagementModal, setShowSessionManagementModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<AppointmentSession[]>([]);
  const screens = useBreakpoint();
  const [showPatientDetailsModal, setShowPatientDetailsModal] = useState(false);
  const [selectedPatientEmail, setSelectedPatientEmail] = useState('');

  // In the parent component's processPaymentData function:
const processPaymentData = useCallback((payments: TherapistPayment[]): TherapistPayment[] => {
  return payments.map(therapistPay => {
    const processedAppointments = therapistPay.appointments.map(apt => {
      // Start with sessions from API or create one if none exists
      let sessionsFromApi: AppointmentSession[] = apt.sessions || [];
      
      if (sessionsFromApi.length === 0) {
        sessionsFromApi = [{
          _id: `${apt._id}-main`,
          date: apt.date,
          price: apt.price,
          status: apt.status,
          paymentStatus: apt.paymentStatus,
          isPaid: apt.paymentStatus === 'completed',
          index: 0
        }];
      }

      const paymentPercentage = apt.paymentPercentage || (therapistPay.therapistLevel === 2 ? 0.57 : 0.5);
      
      const adjustedSessions = sessionsFromApi.map(session => ({
        ...session,
        adjustedPrice: session.price * paymentPercentage,
        isPaid: session.paymentStatus === 'completed',
      }));

      const totalAdjustedPriceForAppointment = adjustedSessions.reduce(
        (sum, s) => sum + (s.adjustedPrice || 0), 
        0
      );

      return {
        ...apt,
        sessions: adjustedSessions,
        paymentPercentage,
        adjustedPrice: totalAdjustedPriceForAppointment,
        // stripeVerified is already included from the backend
      };
    });

    const newTotalAmount = processedAppointments.reduce(
      (sum, apt) => sum + (apt.adjustedPrice || 0), 
      0
    );

    return {
      ...therapistPay,
      therapistLevel: therapistPay.therapistLevel || 1,
      appointments: processedAppointments,
      totalAmount: newTotalAmount,
    };
  });
}, []);

  const fetchPayments = useCallback(async () => {
    try {
      const [pendingRes, availableRes] = await Promise.all([
        fetch("/api/admin/payments/pending"),
        fetch("/api/admin/payments/available")
      ]);
  
      if (pendingRes.ok && availableRes.ok) {
        const [pendingData, availableData] = await Promise.all([
          pendingRes.json(),
          availableRes.json()
        ]);

        const processedPendingPayments = await processPaymentData(
          pendingData.map((p: any) => ({
            ...p,
            therapistLevel: p.therapistLevel || 1
          }))
        );
        
        const processedAvailablePayments = await processPaymentData(
          availableData.map((p: any) => ({
            ...p,
            therapistLevel: p.therapistLevel || 1
          }))
        );
  
        setPendingPayments(processedPendingPayments);
        setAvailablePayments(processedAvailablePayments);
      } else {
        console.error("Failed to fetch payments:", pendingRes.status, availableRes.status);
        message.error("Failed to load payments data from one or more endpoints.");
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      message.error("Failed to load payments");
    }
  }, [processPaymentData]);

  const fetchSummaries = async () => {
    try {
      const response = await fetch("/api/admin/payments/summary");
      if (response.ok) {
        const data = await response.json();
        setPaymentData(data);
      }
    } catch (error) {
      console.error("Error fetching payment summaries:", error);
      message.error("Failed to load payment summaries");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const response = await fetch("/api/admin/payments/history");
      if (response.ok) {
        const data = await response.json();
        setPaymentHistory(data);
      }
    } catch (error) {
      console.error("Error fetching payment history:", error);
      message.error("Failed to load payment history");
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchSummaries();
    fetchPaymentHistory();
  }, [fetchPayments]);

  const toggleTherapistDetails = (therapistId: string) => {
    setExpandedTherapist(expandedTherapist === therapistId ? null : therapistId);
  }

  const toggleHistoryDetails = (paymentId: string) => {
      setExpandedHistoryPayment(expandedHistoryPayment === paymentId ? null : paymentId);
  };
  
  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/payments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to update appointment status');
      }
  
      message.success('Appointment status updated successfully');
      fetchPayments();
    } catch (error: any) {
      message.error(error.message);
    }
  };
  
  const handlePriceChange = async (appointmentId: string, newPrice: number) => {
    try {
      const response = await fetch(`/api/admin/payments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ price: newPrice }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to update appointment price');
      }
  
      message.success('Appointment price updated successfully');
      fetchPayments();
    } catch (error: any) {
      message.error(error.message);
    }
  };
  
  const handleRemoveAppointment = async (appointmentId: string) => {
    Modal.confirm({
      title: 'Are you sure you want to remove this appointment?',
      content: 'This action cannot be undone.',
      okText: 'Remove',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const response = await fetch(`/api/admin/payments/${appointmentId}`, {
            method: 'DELETE',
          });
  
          if (!response.ok) {
            throw new Error('Failed to remove appointment');
          }
  
          message.success('Appointment removed successfully');
          fetchPayments();
        } catch (error: any) {
          message.error(error.message);
        }
      },
    });
  };

  const handlePaymentComplete = useCallback(() => {
      fetchPayments();
      fetchSummaries();
      fetchPaymentHistory();
  }, [fetchPayments]);

  const handleViewPatientDetails = (email: string) => {
    setSelectedPatientEmail(email);
    setShowPatientDetailsModal(true);
  };

  const getPaymentTableColumns = (showPaymentButton: boolean) => {
    const baseColumns = [
      {
        title: 'Therapist',
        dataIndex: 'therapistName',
        key: 'therapistName',
        render: (text: string, record: TherapistPayment) => (
          <Space>
            <Button 
              type="text" 
              icon={expandedTherapist === record.therapistId ? <UpOutlined /> : <DownOutlined />}
              onClick={() => toggleTherapistDetails(record.therapistId)}
              size={screens.md ? 'middle' : 'small'}
            />
            <Text>{screens.md ? text : text.split(' ')[0]}</Text>
          </Space>
        )
      },
      {
        title: 'Amount',
        key: 'amount',
        render: (_: any, record: TherapistPayment) => {
          if (activeTab === 'available') {
            const therapistSessionTotal = selectedSessions
              .filter(s => record.appointments.some(a => a.sessions?.some(appSession => appSession._id === s._id)))
              .reduce((sum, s) => sum + (s.adjustedPrice || s.price || 0), 0);
            return (
              <Text strong>
                <img src="/assets/icons/AED.png" alt="AED" className="inline-block h-4 w-4 -mt-0.5 mr-0.5" />
                {(therapistSessionTotal > 0
                  ? (therapistSessionTotal || 0).toFixed(2)
                  : (record.totalAmount || 0).toFixed(2))}
              </Text>
            );
          }
          return <Text strong><img src="/assets/icons/AED.png" alt="AED" className="inline-block h-4 w-4 -mt-0.5 mr-0.5" />{(record.totalAmount || 0).toFixed(2)}</Text>;
        },
        sorter: (a: TherapistPayment, b: TherapistPayment) => a.totalAmount - b.totalAmount,
      },
      ...(screens.md ? [
        {
          title: 'Sessions',
          key: 'sessions',
          render: (_: any, record: TherapistPayment) => (
            <Text>{record.appointmentCount}</Text>
          )
        },
        {
          title: 'Level',
          key: 'level',
          render: (_: any, record: TherapistPayment) => (
            <Tag color={record.therapistLevel === 2 ? "blue" : "green"}>
              {record.therapistLevel === 2 ? "L2" : "L1"}
            </Tag>
          )
        }
      ] : [])
    ];

    if (showPaymentButton) {
      baseColumns.push({
        title: 'Actions',
        key: 'actions',
        render: (_: any, record: TherapistPayment) => (
          <Button 
            type="primary" 
            onClick={() => {
              setSelectedTherapist(record);
              setShowPaymentDialog(true);
            }}
            size={screens.md ? 'middle' : 'small'}
          >
            {screens.md ? 'Make Payment' : 'Pay'}
          </Button>
        )
      });
    }

    return baseColumns;
  };

const handleViewSessions = async (appointment: Appointment, therapistId: string) => {
  let therapistWalletAddress = '';
  if (therapistId) {
    try {
      const res = await fetch(`/api/therapist/payment-details?therapistId=${therapistId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.otherPaymentDetails === 'string') {
          therapistWalletAddress = data.otherPaymentDetails.trim();
        }
      }
    } catch (e) { /* Ignore error */ }
  }

  // Create all sessions array with proper IDs
  const allSessions: AppointmentSession[] = appointment.sessions?.map((session, index) => ({
    _id: session._id || appointment._id + '-' + index,
    appointmentId: appointment._id,
    date: session.date,
    price: session.price || 0,
    status: session.status as 'in_progress' | 'completed',
    paymentStatus: session.paymentStatus as 'not_paid' | 'paid',
    isPaid: session.paymentStatus === 'paid',
    index: session.index || index,
    patientName: appointment.patient.fullName,
    patientId: appointment.patient._id,
    appointmentType: appointment.plan,
    therapistLevel: appointment.therapist?.level
  })) || [];

  const safeAppointment = {
    ...appointment,
    therapist: { _id: therapistId, level: appointment.therapist?.level ?? 1 },
    therapistWalletAddress,
    sessions: allSessions,
  };
  setSelectedAppointment(safeAppointment);
  setShowSessionManagementModal(true);
};

  const renderSessionManagementModal = () => {
    if (!selectedAppointment) return null;

    return (
      <SessionManagementModal
        id={selectedAppointment._id}
        mainDate={selectedAppointment.date}
        sessions={selectedAppointment.sessions.filter(s=> s.date)}
        appointmentPrice={selectedAppointment.price}
        therapistId={selectedAppointment.therapist._id}
        patientId={selectedAppointment.patient._id}
        selectedSessions={selectedSessions}
        setSelectedSessions={setSelectedSessions}
        isAdmin
        show={showSessionManagementModal}
        onClose={()=>setShowSessionManagementModal(false)}
        onRefresh={async()=>{
         await fetchPayments();
         await fetchPaymentHistory();
        }}
        patientName={selectedAppointment.patient.fullName}
        therpistLevel={selectedAppointment.therapist.level || 1}
      />
    );
  };

  const markSessionAsCompleted = async (appointmentId: string, index: number) => {
    try {
      const response = await fetch('/api/admin/payments/session-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          appointmentId,
          sessionIndex: index
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update session status');
      }

      console.log('Updated session:', result.updatedSession);
      message.success(result.message);
      await fetchPayments(); // Refresh all payments
      // Optionally, you can also force a tab switch or re-fetch available payments only if needed
    } catch (error: any) {
      console.error('Error:', error);
      message.error(error.message);
    }
  };

  const markAppointmentAsPaid = async (appointmentId: string) => {
    Modal.confirm({
      title: 'Confirm Mark as Paid',
      content: (
        <div>
          <p>Are you sure you want to mark this appointment as paid?</p>
          <p style={{ color: 'red', marginTop: '8px' }}>
            <strong>Important:</strong> Please ensure all sessions are paid before marking.
            This will create a manual payment history record with all unpaid sessions.
          </p>
        </div>
      ),
      okText: 'Mark as Paid',
      okType: 'primary',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const response = await fetch(`/api/admin/payments/${appointmentId}/mark-as-paid`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
          });
  
          if (!response.ok) {
            throw new Error('Failed to mark appointment as paid');
          }
  
          message.success('Appointment marked as paid and payment history created');
          fetchPayments(); // Refresh the data
        } catch (error: any) {
          message.error(error.message);
        }
      }
    });
  };

  const renderStripeStatus = (apt: Appointment) => {
  // If no checkout session ID, show no payment info
  if (!apt.checkoutSessionId) {
    return (
      <Tag color="default" icon={<CreditCardOutlined />}>
        No Payment Found
      </Tag>
    );
  }

  // Handle cases where we couldn't verify the payment
  if (apt.stripeVerified === false) {
    return (
      <Tag color="red" icon={<SyncOutlined spin />}>
        Payment Verification Failed
      </Tag>
    );
  }

  // If subscription exists and is active
  if (apt.isStripeActive && apt.stripeSubscriptionStatus === 'active') {
    return (
      <Tag color="green" icon={<CheckCircleOutlined />}>
        Active Subscription
      </Tag>
    );
  }

  // If subscription exists but isn't active
  if (apt.stripeSubscriptionStatus !== 'none' && !apt.isStripeActive) {
    let statusText = apt.stripeSubscriptionStatus?.toUpperCase() || 'INACTIVE';
    let tagColor = 'orange';
    
    // Special cases for subscription statuses
    if (apt.stripeSubscriptionStatus === 'canceled') {
      statusText = 'CANCELED';
      tagColor = 'red';
    } else if (apt.stripeSubscriptionStatus === 'past_due') {
      statusText = 'PAST DUE';
      tagColor = 'orange';
    }

    return (
      <Tag color={tagColor} icon={<ClockCircleOutlined />}>
        {statusText}
      </Tag>
    );
  }

  // If payment is verified but no subscription
  if (apt.stripeVerified) {
    return (
      <Tag color="green" icon={<CheckCircleOutlined />}>
        Payment Verified
      </Tag>
    );
  }

  // Default case for pending verification
  return (
    <Tag color="orange" icon={<SyncOutlined spin />}>
      Payment Pending
    </Tag>
  );
};
  

 const renderAppointmentCard = (apt: Appointment, record: TherapistPayment) => {
  const canRejectPayout = !apt.stripeVerified || !apt.isStripeActive || apt.stripeSubscriptionStatus !== 'active';
  const sortedSessions = [...(apt.sessions || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <Card 
      key={apt._id} 
      className="mb-4 shadow-sm border rounded-lg hover:shadow-md transition-shadow duration-200"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Text 
            strong 
            className="text-lg text-gray-800 truncate"
            ellipsis={{ tooltip: apt.plan }}
          >
            {apt.plan}
          </Text>
          {renderStripeStatus(apt)}
        </div>

        {/* Main Action Buttons */}
        <div className="flex items-center gap-2">
          {activeTab === 'available' && (
            <Tooltip title="View Sessions">
              <Button
                type="text"
                shape="circle"
                icon={<HistoryOutlined />}
                onClick={() => handleViewSessions(apt, record.therapistId)}
                className="text-blue-600 hover:bg-blue-50"
              />
            </Tooltip>
          )}

          <Tooltip title="View Patient Payments">
            <Button
              type="text"
              shape="circle"
              icon={<DollarOutlined />}
              onClick={() => handleViewPatientDetails(apt.patient.email)}
              className="text-green-600 hover:bg-green-50"
            />
          </Tooltip>

          {/* Actions Dropdown */}
          <Dropdown
            menu={{
              items: [
                {
                  key: 'mark-paid',
                  label: 'Mark as Paid',
                  icon: <CheckCircleOutlined />,
                  onClick: () => markAppointmentAsPaid(apt._id)
                },
                {
                  key: 'link-payment',
                  label: 'Link Payment',
                  icon: <LinkOutlined />,
                  onClick: () => {
                    setSelectedAppointmentForPayment(apt);
                    setShowLinkPaymentModal(true);
                  },
                  disabled: apt.stripeVerified && apt.isStripeActive
                },
                {
                  key: 'reject-payout',
                  label: 'Reject Payout',
                  icon: <StopOutlined />,
                  danger: true,
                  onClick: () => handleRejectPayout(apt),
                  disabled: !canRejectPayout || apt.isPayoutRejected
                },
                {
                  key: 'delete',
                  label: 'Delete',
                  icon: <DeleteOutlined />,
                  danger: true,
                  onClick: () => handleRemoveAppointment(apt._id)
                }
              ]
            }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button 
              type="text"
              shape="circle"
              icon={<EllipsisOutlined />}
              className="hover:bg-gray-100"
            />
          </Dropdown>
        </div>
      </div>

      {/* Status Indicators */}
      {apt.isPayoutRejected && (
        <div className="mt-2">
          <Tag color="red" className="w-full">
            <div className="flex items-center justify-between">
              <span>Rejected</span>
              {apt.rejectedPayoutNote && (
                <span className="ml-2 font-normal">{apt.rejectedPayoutNote}</span>
              )}
            </div>
          </Tag>
        </div>
      )}

      <Divider className="my-3" />

      {/* Appointment Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1">
          <Text type="secondary" className="text-xs">Patient</Text>
          <Text className="font-medium">{apt.patient.fullName}</Text>
        </div>

        <div className="space-y-1">
          <Text type="secondary" className="text-xs">Appointment Date</Text>
          <Text className="font-medium">
            {dayjs(apt.date).isValid() ? dayjs(apt.date).format("MMM D, YYYY h:mm A") : "N/A"}
          </Text>
        </div>

        <div className="space-y-1">
          <Text type="secondary" className="text-xs">Total Sessions</Text>
          <Text className="font-medium">{apt.totalSessions}</Text>
        </div>

        <div className="space-y-1">
          <Text type="secondary" className="text-xs">Status</Text>
          <Tag 
            color={apt.status === 'completed' ? 'green' : 'blue'} 
            className="w-fit"
          >
            {apt.status.toUpperCase()}
          </Tag>
        </div>

        <div className="space-y-1">
          <Text type="secondary" className="text-xs">Total Price</Text>
          <div className="flex items-center">
            <img src="/assets/icons/AED.png" alt="AED" className="h-4 w-4 mr-1" />
            <Text className="font-medium">{(apt.price || 0).toFixed(2)}</Text>
          </div>
        </div>

        <div className="space-y-1">
          <Text type="secondary" className="text-xs">Payment Status</Text>
          <Tag 
            color={apt.paymentStatus === 'completed' ? 'green' : 'orange'} 
            className="w-fit"
          >
            {apt?.paymentStatus?.toUpperCase()}
          </Tag>
        </div>

        {activeTab !== 'history' && apt.adjustedPrice !== undefined && (
          <div className="space-y-1">
            <Text type="secondary" className="text-xs">Adjusted Payout</Text>
            <div className="flex items-center">
              <img src="/assets/icons/AED.png" alt="AED" className="h-4 w-4 mr-1" />
              <Text className="font-medium">{(apt.adjustedPrice || 0).toFixed(2)}</Text>
            </div>
          </div>
        )}

        {apt.therapistPaid !== undefined && (
          <div className="space-y-1">
            <Text type="secondary" className="text-xs">Therapist Payout</Text>
            <Tag 
              color={apt.therapistPaid ? 'green' : 'red'} 
              className="w-fit"
            >
              {apt.therapistPaid ? 'PAID' : 'UNPAID'}
            </Tag>
          </div>
        )}
      </div>

      {/* Sessions Section */}
      {activeTab !== 'history' && sortedSessions.length > 0 && (
        <>
          <Divider className="my-3" />
          <Text strong className="block mb-2">Individual Sessions</Text>
          <div className="space-y-2">
            {sortedSessions.map((session, index) => {
              const isCurrentSession = session.date === apt.date;
              return (
                <div 
                  key={session._id} 
                  className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 rounded-lg ${
                    isCurrentSession ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isCurrentSession && (
                      <Tag color="blue" className="m-0">Current</Tag>
                    )}
                    <Text className={isCurrentSession ? 'font-medium' : ''}>
                      {dayjs(session.date).isValid() 
                        ? dayjs(session.date).format("MMM D, YYYY h:mm A") 
                        : "Invalid date"}
                    </Text>
                  </div>

                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <Tag color={session.status === 'completed' ? 'green' : 'blue'}>
                      {session.status.toUpperCase().replace(/_/g, ' ')}
                    </Tag>
                    <Tag color={session.paymentStatus === 'completed' ? 'green' : 'orange'}>
                      {session?.paymentStatus?.toUpperCase()?.replace(/_/g, ' ')}
                    </Tag>
                    <div className="flex items-center">
                      <img src="/assets/icons/AED.png" alt="AED" className="h-4 w-4 mr-1" />
                      <Text strong>{(session.price || 0).toFixed(2)}</Text>
                    </div>
                    {session.adjustedPrice !== undefined && (
                      <Text type="secondary" className="text-sm">
                        (Adj: {(session.adjustedPrice || 0).toFixed(2)})
                      </Text>
                    )}
                    {!(session.status === 'completed') && (
                      <Button
                        type="link"
                        size="small"
                        onClick={() => markSessionAsCompleted(apt._id, index)}
                        className="text-blue-600"
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
};

  const renderPaymentTable = (payments: TherapistPayment[], showPaymentButton: boolean = false) => {
    return (
      <>
        <Table
          columns={getPaymentTableColumns(showPaymentButton)}
          dataSource={payments}
          rowKey="therapistId"
          size={screens.md ? 'middle' : 'small'}
          scroll={{ x: true }}
          expandable={{
            expandedRowRender: (record) => {
              const therapistSessionTotal = selectedSessions
                .filter(s => record.appointments.some(a => a.sessions?.some(appSession => appSession._id === s._id)))
                .reduce((sum, s) => sum + (s.adjustedPrice || s.price || 0), 0);
              return (
                <div className="p-2 bg-gray-50">
                  <div className="mb-2 font-semibold text-blue-700">
                    Selected Sessions Total: <img src="/assets/icons/AED.png" alt="AED" className="inline-block h-4 w-4 -mt-0.5 mr-0.5" />{(therapistSessionTotal || 0).toFixed(2)}
                  </div>
                  {record.appointments.map(apt => renderAppointmentCard(apt, record))}
                </div>
              );
            },
            expandRowByClick: true,
            expandedRowKeys: expandedTherapist ? [expandedTherapist] : [],
            onExpand: (expanded, record) => {
                setExpandedTherapist(expanded ? record.therapistId : null);
                setSelectedSessions([]);
            }
          }}
          locale={{
            emptyText: 'No payments available'
          }}
        />

        <Modal
          title={`Patient Payment History`}
          open={showPatientPayments}
          onCancel={() => setShowPatientPayments(false)}
          width={screens.md ? 800 : '90%'}
          footer={[
            <Button key="back" onClick={() => setShowPatientPayments(false)}>
              Close
            </Button>
          ]}
        >
          <Table
            columns={[
              {
                title: 'Date',
                dataIndex: 'created',
                key: 'date',
                render: (date: string) => dayjs(date).format('MMM D,YYYY')
              },
              {
                title: 'Amount',
                dataIndex: 'amount',
                key: 'amount',
                render: (amount: number) => (
                  <Text strong>
                    <img src="/assets/icons/AED.png" alt="AED" className="inline-block h-4 w-4 -mt-0.5 mr-0.5" />
                    {(amount || 0).toFixed(2)}
                  </Text>
                )
              },
              ...(screens.md ? [
                {
                  title: 'Method',
                  dataIndex: 'payment_method',
                  key: 'method',
                  render: (method: string) => (
                    <Tag color={method === 'card' ? 'blue' : 'orange'}>
                      {method ? method.toUpperCase() : 'N/A'}
                    </Tag>
                  )
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status: string) => (
                    <Tag 
                      icon={status === 'succeeded' ? <CheckCircleOutlined /> : <SyncOutlined spin />}
                      color={status === 'succeeded' ? 'green' : 'orange'}
                    >
                      {status.toUpperCase()}
                    </Tag>
                  )
                },
                {
                  title: 'Receipt',
                  dataIndex: 'receipt_url',
                  key: 'receipt_url',
                  render: (url: string) => (
                    url ? <Button type="link" href={url} target="_blank">View</Button> : '-'
                  )
                }
              ] : [])
            ]}
            dataSource={patientPayments}
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ x: true }}
            loading={loadingPayments}
            locale={{ emptyText: "No patient payment history found" }}
          />
        </Modal>
      </>
    );
  };

  return (
    <div className="p-4 space-y-6">
      {/* Reject payout modal (global, not inside card) */}
      <Modal
        title="Reject Payout for Appointment"
        open={showRejectModal}
        onCancel={() => setShowRejectModal(false)}
        onOk={submitRejectPayout}
        okText="Reject"
        okButtonProps={{ danger: true }}
        cancelText="Cancel"
      >
        <div style={{ marginBottom: 12 }}>
          <strong>Quick Notes:</strong>
          <div style={{ marginTop: 8, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {quickRejectNotes.map((note, idx) => (
              <Button
                key={idx}
                type="dashed"
                size="small"
                style={{ textAlign: 'left' }}
                onClick={() => setRejectNote(note)}
              >
                {note}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <strong>Custom Note:</strong>
          <textarea
            value={rejectNote}
            onChange={e => setRejectNote(e.target.value)}
            rows={3}
            style={{ width: '100%', marginTop: 6 }}
            placeholder="Enter rejection reason or select a quick note above"
          />
        </div>
      </Modal>
      <h1 className="text-3xl font-bold mb-6">Payments Overview</h1>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spin size="large" tip="Loading summary..." />
        </div>
      ) : (
        <Card className="shadow-md rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Statistic 
              title="Total Pending Payout" 
              value={paymentData.totalPending} 
              precision={2} 
              prefix={<img src="/assets/icons/AED.png" alt="AED" className="inline-block h-4 w-4 -mt-0.5 mr-0.5" />}
              valueStyle={{ color: '#cf1322' }} 
            />
            <Statistic 
              title="Total Appointments Amount" 
              value={paymentData.totalAppointments.amount} 
              precision={2} 
              prefix={<img src="/assets/icons/AED.png" alt="AED" className="inline-block h-4 w-4 -mt-0.5 mr-0.5" />}
              valueStyle={{ color: '#3f8600' }} 
            />
            <Statistic 
              title="Total Appointments Count" 
              value={paymentData.totalAppointments.count} 
              valueStyle={{ color: '#0056b3' }} 
            />
            <div className="flex items-center justify-center">
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => setShowAddPaymentDialog(true)}
                className="mt-4"
              >
                Add Manual Payment
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab} 
        size={screens.md ? 'large' : 'small'}
        className="[&>.ant-tabs-nav]:mb-4"
      >
        <TabPane 
          tab={
            <span className="flex items-center">
              <ClockCircleOutlined className="mr-1" />Pending Payouts ({pendingPayments.length})
            </span>
          } 
          key="pending"
        >
          {isLoading ? (
            <div className="flex justify-center py-8"><Spin tip="Loading pending payments..." /></div>
          ) : (
            renderPaymentTable(pendingPayments)
          )}
        </TabPane>
        <TabPane 
          tab={
            <span className="flex items-center">
              <DollarOutlined className="mr-1" />Available for Payout ({availablePayments.length})
            </span>
          } 
          key="available"
        >
          {isLoading ? (
            <div className="flex justify-center py-8"><Spin tip="Loading available payments..." /></div>
          ) : (
            renderPaymentTable(availablePayments, true)
          )}
        </TabPane>
        <TabPane 
          tab={
            <span className="flex items-center">
              <HistoryOutlined className="mr-1" />Payment History ({paymentHistory.length})
            </span>
          } 
          key="history"
        >
          {isLoading ? (
    <div className="flex justify-center py-8"><Spin tip="Loading payment history..." /></div>
  ) : (
    <Table
      columns={[
        {
          title: 'Date',
          dataIndex: 'paidAt',
          key: 'paidAt',
          render: (date: string) => dayjs(date).isValid() ? dayjs(date).format('MMM D,YYYY h:mm A') : 'N/A',
          sorter: (a: PaymentHistory, b: PaymentHistory) => 
            dayjs(a.paidAt).isValid() && dayjs(b.paidAt).isValid() 
              ? dayjs(a.paidAt).unix() - dayjs(b.paidAt).unix() 
              : 0,
          },
                {
                  title: 'Therapist',
                  dataIndex: ['therapist', 'fullName'],
                  key: 'therapistName',
                },
                {
                  title: 'Amount Paid',
                  dataIndex: 'amount',
                  key: 'amount',
                  render: (amount: number, record: PaymentHistory) => {
                    // Calculate total from session prices if available
                    const totalFromSessions = record.sessions?.reduce((sum, session) => 
                      sum + (session.price || 0), 0) || amount;
                    
                    return (
                      <Text strong> 
                        <><img src="/assets/icons/AED.png" alt="AED" className="inline-block h-4 w-4 -mt-0.5 mr-0.5" />{record.paymentMethod==='USDT' ? amount : ( totalFromSessions || 0).toFixed(2)}</>
                      </Text>
                    );
                  },
                  sorter: (a: PaymentHistory, b: PaymentHistory) => a.amount - b.amount,
                },,
                {
                  title: 'Method',
                  dataIndex: 'paymentMethod',
                  key: 'paymentMethod',
                  render: (method: string) => (
                    <Tag color={method === 'usdt' ? 'blue' : 'green'}>{method ? method.toUpperCase() : 'N/A'}</Tag>
                  ),
                },
              ]}
              dataSource={paymentHistory}
              rowKey="_id"
              size={screens.md ? 'middle' : 'small'}
              scroll={{ x: true }}
              expandable={{
                expandedRowRender: (record) => (
                  <div className="p-2 bg-gray-50">
                    <Text strong className="block mb-2">Appointments Covered by this Payment:</Text>
                    {record.appointments && record.appointments.length > 0 ? (
                      record.appointments.map(apt => {
                        // Calculate total for this appointment's sessions 
                        const appointmentSessions = record.sessions?.filter(s => {
                          if (!s?._id) return false;
                          // Check if session belongs to this appointment
                          const sessionAppointmentId = s._id.split('-')[0];
                          return sessionAppointmentId === apt._id;
                        }) || []; 
                        const appointmentTotal = appointmentSessions.reduce( 
                          (sum, session) => sum + (session.price || 0), 0);
                
                        return (
                          <Card key={apt._id} size="small" className="mb-2 shadow-sm border">
                            <Space direction="vertical" style={{ width: '100%' }}>
                              <div className="flex justify-between items-start">
                                <Text strong>{apt.plan}</Text>
                                {apt.isPaid && <Tag color="green">FULLY PAID</Tag>}
                              </div>
                              <Text>Patient: {apt.patient?.fullName || 'N/A'}</Text>
                              <Text>Date: {dayjs(apt.date).isValid() ? dayjs(apt.date).format('MMM D,YYYY h:mm A') : 'N/A'}</Text>
                              <Text>Status: <Tag>{apt.status?.toUpperCase() || 'N/A'}</Tag></Text>
                              <Text>
                                Total: <img src="/assets/icons/AED.png" alt="AED" className="inline-block h-4 w-4 -mt-0.5 mr-0.5" />
                                {(appointmentTotal || apt.price || 0).toFixed(2)}
                              </Text>
                              
                              <Divider className="my-2" />
                              <Text strong>Paid Sessions:</Text>
                              <div className="grid grid-cols-1 gap-1">
                                {appointmentSessions.map(session => (
                                  <div key={session._id} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                                    <div>
                                      <Text>
                                        {dayjs(session.date).isValid() 
                                          ? dayjs(session.date).format("MMM D,YYYY h:mm A") 
                                          : "Invalid date"}
                                      </Text>
                                      <div className="flex gap-2 mt-1">
                                        <Tag color={session.paymentStatus === 'completed' ? 'green' : 'orange'}>
                                          {session.paymentStatus?.toUpperCase() || 'N/A'}
                                        </Tag>
                                        {session.paidAt && (
                                          <Tag>
                                            Paid: {dayjs(session.paidAt).format('MMM D, YYYY')}
                                          </Tag>
                                        )}
                                        {session.isCurrent && (
                                          <Tag color="blue">Current Session</Tag>
                                        )}
                                      </div>
                                    </div>
                                    <Text strong>
                                      <img src="/assets/icons/AED.png" alt="AED" className="inline-block h-4 w-4 -mt-0.5 mr-0.5" />
                                      {(session.price || 0).toFixed(2)}
                                    </Text>
                                  </div>
                                ))}
                              </div>
                            </Space>
                          </Card>
                        );
                      })
                    ) : (
                      <Text type="secondary">No specific appointments linked to this payment.</Text>
                    )}
                    {record.paymentMethod === 'usdt' && (
                        <div className="mt-4">
                            <Text strong>USDT Details:</Text>
                            <Text className="block">Transaction ID: {record.transactionId || 'N/A'}</Text>
                            <Text className="block">Wallet Address: {record.cryptoAddress || 'N/A'}</Text>
                        </div>
                    )}
                     {record.paymentMethod === 'manual' && (
                        <div className="mt-4">
                            <Text strong>Manual Note:</Text>
                            <Text className="block">{record.manualNote || 'No note provided.'}</Text>
                        </div>
                    )}
                  </div>
                ),
                expandRowByClick: true,
                expandedRowKeys: expandedHistoryPayment ? [expandedHistoryPayment] : [],
                onExpand: (expanded, record) => setExpandedHistoryPayment(expanded ? record._id : null),
              }}
              locale={{
                emptyText: 'No payment history found'
              }}
            />
          )}
        </TabPane>
        <TabPane 
          tab={
            <span className="flex items-center">
              <CreditCardOutlined className="mr-1" />Patient Payments (Stripe)
            </span>
          } 
          key="patient-payments"
        >
          <StripePaymentsTable />
        </TabPane>
      </Tabs>

      {selectedTherapist && (
        <PaymentDialog
          therapist={selectedTherapist}
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          onPaymentComplete={handlePaymentComplete}
          selectedSessions={selectedSessions}
          setSelectedSessions={setSelectedSessions}
        />
      )}

      <AddPaymentDialog
        open={showAddPaymentDialog}
        onOpenChange={setShowAddPaymentDialog}
        onSuccess={()=> console.log('added')}
      />

<PatientPaymentDetailsModal
  email={selectedPatientEmail}
  open={showPatientDetailsModal}
  onClose={() => setShowPatientDetailsModal(false)}
/>

{selectedAppointmentForPayment && (
  <LinkPaymentModal
    open={showLinkPaymentModal}
    onOpenChange={setShowLinkPaymentModal}
    patientId={selectedAppointmentForPayment.patient._id}
    customerId={selectedAppointmentForPayment.patient.customerId}
    email={selectedAppointmentForPayment.patient.email}
    onSelectPayment={(paymentId) => 
      handleLinkPayment(selectedAppointmentForPayment._id, paymentId)
    }
    currentSessionId={selectedAppointmentForPayment.checkoutSessionId}
  />
)}

      {renderSessionManagementModal()}
    </div>
  );
}