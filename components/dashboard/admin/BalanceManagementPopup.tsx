"use client"

import { useState, useEffect } from "react";
import { 
  Modal, 
  Form, 
  InputNumber, 
  Radio, 
  Table, 
  Tag, 
  Spin,
  message,
  Input,
  Button,
  Alert,
  Select
} from "antd";

type PaymentItem = {
  id: string;
  amount: number;
  currency: string;
  created: number;
  description?: string;
  metadata?: any;
  type: string;
  customer: string;
  receipt_url?: string;
  status: string;
};

type Plan = {
  _id: string;
  title: string;
  price: number;
  type: string;
};

type SessionHistoryItem = {
  action: "add" | "remove";
  sessions: number;
  reason?: string | null;
  admin?: string;
  createdAt: string;
  plan?: {
    _id: string;
    title: string;
  };
};

type Patient = {
  _id: string;
  fullName: string;
  email: string;
  telephone: string;
  createdAt: string;
  status: string;
  image?: string;
  therapy?: any;
  balance: {
    totalSessions: number;
    spentSessions: number;
    remainingSessions: number;
    history: SessionHistoryItem[];
    payments: {
      paymentId: string;
      amount: number;
      currency: string;
      date: Date;
      sessionsAdded: number;
    }[];
  };
  stripeCustomerId?: string;
};

interface BalanceManagementPopupProps {
  visible: boolean;
  onClose: () => void;
  patient: Patient | null;
  onSuccess: () => void;
}

export default function BalanceManagementPopup({
  visible,
  onClose,
  patient,
  onSuccess
}: BalanceManagementPopupProps) {
  const [form] = Form.useForm();
  const action = Form.useWatch("action", form);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [paymentSearch, setPaymentSearch] = useState({
    email: patient?.email || '',
    customerId: patient?.stripeCustomerId || ''
  });
  const [showPaymentSearch, setShowPaymentSearch] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  // Removed DEFAULT_BALANCE_RATE - now using direct AED amounts
  const selectedPlan = Form.useWatch("plan", form);
  const [price, setPrice] = useState<number | null>(null);

  const handlePriceChange = (value: number | null) => {
    setPrice(value);
    // Direct AED amount - no conversion needed
  };

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setPayments([]);
      setSelectedPayment(null);
      setShowPaymentSearch(false);
      setPaymentSearch({
        email: patient?.email || '',
        customerId: patient?.stripeCustomerId || ''
      });
    }
  }, [visible, form, patient]);

  useEffect(() => {
    if (selectedPayment && action === 'add') {
      const payment = payments.find(p => p.id === selectedPayment);
      if (payment) {
        // Direct AED amount - no conversion needed
        form.setFieldsValue({
          price: payment.amount * 0.01
        });
      }
    }
  }, [selectedPayment, payments, form, action]);

  const fetchPayments = async () => {
    if (!patient) return;
    
    setIsLoadingPayments(true);
    try {
      const response = await fetch('/api/admin/users/patients/verified-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: patient._id,
          customerId: paymentSearch.customerId,
          email: paymentSearch.email
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (data.canSearch) {
          setShowPaymentSearch(true);
        }
        throw new Error(data.error || 'Failed to fetch payments');
      }

      setPayments(data.payments);
      setShowPaymentSearch(false);
    } catch (error) {
      console.error('Error fetching payments:', error);
      message.error(error instanceof Error ? error.message : 'Failed to fetch payments');
    } finally {
      setIsLoadingPayments(false);
    }
  };

const handleSubmit = async () => {
  try {
    const values = await form.validateFields();
    const selectedPaymentDetails = payments.find(p => p.id === selectedPayment);
    
    setIsLoading(true);

    const body = {
      userId: patient?._id,
      action: values.action,
      sessions: values.sessions,
      reason: values.reason,
      payment: action === 'add' ? selectedPaymentDetails : undefined,
      price: values.price
    };

    const response = await fetch('/api/admin/users/patients/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update sessions');
    }

    message.success('Sessions updated successfully');
    onSuccess();
    onClose();
  } catch (error) {
    console.error('Error updating sessions:', error);
    message.error(error instanceof Error ? error.message : 'Failed to update sessions');
  } finally {
    setIsLoading(false);
  }
};

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount / 100);
  };

  return (
    <Modal
      title={`Manage Sessions for ${patient?.fullName || 'Patient'}`}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="Submit"
      cancelText="Cancel"
      confirmLoading={isLoading}
      width={800}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="action"
          label="Action"
          rules={[{ required: true, message: 'Please select an action' }]}
        >
          <Radio.Group onChange={() => {
            setSelectedPayment(null);
            setPayments([]);
          }}>
            <Radio value="add">Add Sessions</Radio>
            <Radio value="remove">Remove Sessions</Radio>
          </Radio.Group>
        </Form.Item>

        {action === 'add' && (
          <>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Payment Verification</h4>
                {!showPaymentSearch && payments.length === 0 && (
                  <Button 
                    type="link" 
                    onClick={fetchPayments}
                    loading={isLoadingPayments}
                  >
                    Verify Payment
                  </Button>
                )}
              </div>

              {showPaymentSearch && (
                <div className="bg-gray-50 p-4 rounded mb-4">
                  <Alert 
                    message="No customer found with default details" 
                    type="info" 
                    showIcon 
                    className="mb-4"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Customer Email</label>
                      <Input
                        value={paymentSearch.email}
                        onChange={(e) => setPaymentSearch({...paymentSearch, email: e.target.value})}
                        placeholder="Enter customer email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Stripe Customer ID</label>
                      <Input
                        value={paymentSearch.customerId}
                        onChange={(e) => setPaymentSearch({...paymentSearch, customerId: e.target.value})}
                        placeholder="Enter customer ID"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button 
                      type="primary" 
                      onClick={fetchPayments}
                      loading={isLoadingPayments}
                    >
                      Search Payments
                    </Button>
                  </div>
                </div>
              )}

              {isLoadingPayments ? (
                <Spin />
              ) : payments.length > 0 ? (
                <div className="border rounded">
                  <div className="p-2 bg-gray-50 border-b">
                    <h4 className="font-medium">Available Payments</h4>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {payments.map(payment => {
                      const paymentType = 
                          payment.id.startsWith('sub_') ? 'Subscription' :
                          payment.id.startsWith('pi_') ? 'Payment Intent' :
                          payment.id.startsWith('ch_') ? 'Charge' :
                          payment.id.startsWith('cs_') ? 'Checkout Session' :
                         'Payment';
                      const isUsed = patient?.balance?.payments?.some(p => p.paymentId === payment.id);
                      return (
                        <div key={payment.id} className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                          selectedPayment === payment.id ? 'bg-blue-50' : ''
                        } ${
                          isUsed ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={() => !isUsed && setSelectedPayment(payment.id)}
                        >
                          <div className="flex justify-between">
                            <div>
                              <div className="font-medium">
                                {formatAmount(payment.amount, payment.currency)}
                                <span className="ml-2 text-sm text-gray-500">{paymentType}</span>
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(payment.created * 1000).toLocaleString()}
                              </div>
                              {payment.description && (
                                <div className="text-sm mt-1">{payment.description}</div>
                              )}
                            </div>
                            <div className="flex flex-col items-end">
                              {isUsed ? (
                                <Tag color="orange">Used</Tag>
                              ) : selectedPayment === payment.id ? (
                                <Tag color="green">Selected</Tag>
                              ) : null}
                              {payment.receipt_url && (
                                <a 
                                  href={payment.receipt_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-500 text-sm mt-1"
                                  onClick={e => e.stopPropagation()}
                                >
                                  View Receipt
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {selectedPayment && (
                <Alert 
                  message="Payment selected" 
                  type="success" 
                  showIcon 
                  className="mt-2"
                />
              )}
            </div>
          </>
        )}

       <Form.Item
  name="sessions"
  hidden
>
  <InputNumber />
</Form.Item>

       <Form.Item
  name="price"
  label="Amount (AED)"
  rules={[
    { required: true, message: 'Please enter amount' },
    { type: 'number', min: 1, message: 'Must be at least 1' }
  ]}
>
  <InputNumber 
    min={1}
    style={{ width: '100%' }} 
    onChange={handlePriceChange}
    disabled={!selectedPayment && action === 'add'}
  />
</Form.Item>
    

        {calculatedSessions !== null && (
  <div className="mb-4">
    <Alert
      message={`${price} AED = ${calculatedSessions} sessions`}
      type="info"
      showIcon
    />
  </div>
)}

        <Form.Item
          name="reason"
          label="Reason (Optional)"
        >
          <Input.TextArea placeholder="Enter reason for session change" />
        </Form.Item>

        <div className="p-4 bg-gray-50 rounded">
          <div className="font-medium">Current Balance</div>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div>
              <div className="text-sm text-gray-500">Total Sessions</div>
              <div className="text-lg font-semibold">
                {patient?.balance?.totalSessions || 0}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Used Sessions</div>
              <div className="text-lg font-semibold">
                {patient?.balance?.spentSessions || 0}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Remaining</div>
              <div className="text-lg font-semibold">
                {patient?.balance?.remainingSessions || 0}
              </div>
            </div>
          </div>
        </div>

        <div className="font-medium text-lg mb-2">Session History</div>
        {isLoadingHistory ? (
          <Spin />
        ) : (
          <div className="overflow-x-auto">
            <Table
              columns={[
                {
                  title: "Date",
                  dataIndex: "createdAt",
                  render: (text: string) => new Date(text).toLocaleString(),
                  sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                  defaultSortOrder: 'descend',
                },
                {
                  title: "Action",
                  dataIndex: "action",
                  render: (value: string) => {
                    switch(value) {
                      case 'add':
                        return <Tag color="green">Added</Tag>;
                      case 'remove':
                        return <Tag color="red">Removed</Tag>;
                      default:
                        return <Tag>{value}</Tag>;
                    }
                  },
                },
                {
                  title: "Sessions",
                  dataIndex: "sessions",
                  render: (value: number) => <span className="font-medium">{value}</span>,
                },
                {
                  title: "Plan",
                  dataIndex: ["plan", "title"],
                  render: (text: string) => text || <span className="text-gray-400">N/A</span>,
                },
                {
                  title: "Reason",
                  dataIndex: "reason",
                  render: (text: string) => text || <span className="text-gray-400">N/A</span>,
                },
              ]}
              dataSource={patient?.balance?.history || []}
              rowKey={(record) => `${record.createdAt}-${Math.random()}`}
              pagination={{
                pageSize: 5,
                showSizeChanger: false,
              }}
              scroll={{ x: true }}
              locale={{
                emptyText: 'No session history found'
              }}
            />
          </div>
        )}
      </Form>
    </Modal>
  );
}