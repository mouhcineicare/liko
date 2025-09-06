import React, { useState, useEffect, useCallback } from "react";
import { 
  Modal, 
  Button, 
  Table, 
  Tag, 
  message,
  Form,
  Divider,
  Select,
  Typography,
  Input,
  InputNumber,
  Alert,
  Spin,
  Space,
  Card
} from "antd";
import { 
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  DeleteOutlined,
  BankOutlined
} from "@ant-design/icons";
import dayjs from 'dayjs';

const { Text } = Typography;

interface AppointmentSession {
  _id: string;
  date: string;
  price: number;
  status: string;
  paymentStatus: string;
  isPaid: boolean;
  index: number;
}

interface TherapistPayment {
  therapistId: string;
  therapistName: string;
  therapistEmail: string;
  therapistLevel: number;
}

interface PaymentDialogProps {
  therapist: TherapistPayment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentComplete: () => void;
  selectedSessions: AppointmentSession[];
  setSelectedSessions: (sessions: AppointmentSession[]) => void;
}

const paymentMethods = [
  { value: "manual", label: "Manual Transfer" },
  { value: "usdt", label: "USDT (Binance Pay)" },
];

export default function PaymentDialog({
  therapist,
  open,
  onOpenChange,
  onPaymentComplete,
  selectedSessions = [],
  setSelectedSessions,
}: PaymentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("manual");
  const [cryptoAddress, setCryptoAddress] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [isBinanceLoading, setIsBinanceLoading] = useState(false);
  const [customPercentage, setCustomPercentage] = useState<number | null>(null);
  const [customTotal, setCustomTotal] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(3.67);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [manualRate, setManualRate] = useState<string>('3.67');
  const [usingManualRate, setUsingManualRate] = useState(false);

  // Calculate payment percentage (default or custom)
  const paymentPercentage = customPercentage !== null ? 
    customPercentage / 100 : 
    (therapist.therapistLevel === 2 ? 0.57 : 0.5);

  // Calculate total amount (either custom or calculated from sessions)
  const totalAmountAEDPayout = customTotal !== null ? customTotal : 
    selectedSessions.reduce(
      (sum, session) => sum + (session.price * paymentPercentage), 
      0
    );

  // Fetch exchange rate from API
  const fetchExchangeRate = useCallback(async () => {
    setIsLoadingRate(true);
    setUsingManualRate(false);
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!response.ok) throw new Error('Failed to fetch exchange rate');
      const data = await response.json();
      if (data.result === 'success' && data.rates?.AED) {
        const rate = data.rates.AED;
        setExchangeRate(rate);
        setManualRate(rate.toFixed(4));
        message.success('Exchange rate updated');
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      message.error('Failed to load exchange rate. Using default rate (3.67 AED/USDT).');
      setExchangeRate(3.67);
      setManualRate('3.6700');
    } finally {
      setIsLoadingRate(false);
    }
  }, []);

  // Load wallet address and exchange rate when dialog opens
  useEffect(() => {
    if (open) {
      fetchExchangeRate();
      if (therapist.therapistId) {
        setWalletLoading(true);
        fetch(`/api/admin/users/therapists/${therapist.therapistId}/payment-details`)
          .then(async (res) => {
            if (!res.ok) throw new Error("Failed to fetch wallet address");
            const data = await res.json();
            if (!cryptoAddress || data.paymentDetails?.otherPaymentDetails) {
              setCryptoAddress(data.paymentDetails?.otherPaymentDetails || "");
            }
          })
          .catch((err) => {
            console.error("Wallet fetch error:", err);
            setWalletError("Could not fetch wallet address");
          })
          .finally(() => setWalletLoading(false));
      }
    }
  }, [open, therapist.therapistId, fetchExchangeRate]);

  // Handle manual rate input changes
  const handleManualRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualRate(e.target.value);
  };

  // Apply manually entered exchange rate
  const applyManualRate = () => {
    const numValue = Number(manualRate);
    if (!isNaN(numValue) && numValue > 0) {
      setExchangeRate(numValue);
      setUsingManualRate(true);
      message.success('Manual exchange rate applied');
    } else {
      message.error('Please enter a valid exchange rate');
    }
  };

  // Reset to automatic exchange rate
  const resetToAutoRate = () => {
    fetchExchangeRate();
  };

  // Process Binance withdrawal
  const processBinanceWithdrawal = async (amountUSDT: number) => {
    setIsBinanceLoading(true);
    try {
      const response = await fetch('/api/admin/payments/binance', {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amountUSDT.toFixed(6)),
          walletAddress: cryptoAddress,
          therapistId: therapist.therapistId,
          therapistLevel: therapist.therapistLevel,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Binance payment failed');
      return {
        transactionId: data.transactionId,
        actualAmountUSDT: data.amount
      };
    } catch (error: any) {
      message.error(error.message || 'Failed to process Binance withdrawal');
      throw error;
    } finally {
      setIsBinanceLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (selectedSessions.length === 0) {
      message.error("Please select at least one session to pay");
      return;
    }

    setIsLoading(true);
    setTransactionId("");

    try {
      let finalAmountToSend = totalAmountAEDPayout;
      let finalTransactionId = manualNote;

      if (paymentMethod === "usdt") {
        if (!exchangeRate) {
          message.error("Exchange rate not available");
          return;
        }
        if (!cryptoAddress) {
          message.error("USDT Wallet Address is required");
          return;
        }

        const amountUSDTToWithdraw = totalAmountAEDPayout / exchangeRate;
        const withdrawalResult = await processBinanceWithdrawal(amountUSDTToWithdraw);
        finalTransactionId = withdrawalResult.transactionId;
        finalAmountToSend = withdrawalResult.actualAmountUSDT;
        setTransactionId(finalTransactionId);
      }

      const paymentData = {
        therapistId: therapist.therapistId,
        amount: finalAmountToSend,
        paymentMethod,
        sessionIds: selectedSessions.map(s => s._id),
        therapistLevel: therapist.therapistLevel,
        payoutPercentage: paymentPercentage * 100,
        ...(paymentMethod === "manual" && { manualNote }),
        ...(paymentMethod === "usdt" && {
          cryptoAddress,
          transactionId: finalTransactionId,
          exchangeRate,
        }),
      };

      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to process payment");
      }

      message.success("Payment processed successfully");
      onPaymentComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error processing payment:", error);
      message.error(error.message || "Failed to process payment");
    } finally {
      setIsLoading(false);
    }
  };

  // Remove single session from selection
  const handleRemoveSession = (sessionIdToRemove: string) => {
    setSelectedSessions(selectedSessions.filter(
      (session) => session._id !== sessionIdToRemove
    ));
    message.info('Session removed from list.');
  };

  // Clear all selected sessions
  const handleClearAllSessions = () => {
    setSelectedSessions([]);
    message.info('All sessions cleared from list.');
  };

  // Table columns configuration
  const sessionColumns = [
    {
      title: 'Session #',
      dataIndex: 'index',
      key: 'index',
      render: (index: number) => (
        <Tag color={index === 1000 ? 'blue' : 'default'}>
          {index === 1000 ? 'Current' : `#${index}`}
        </Tag>
      )
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('MMM D,YYYY h:mm A')
    },
    {
      title: 'Original Price (AED)',
      key: 'originalPrice',
      render: (_: any, record: AppointmentSession) => (
        <Text strong>د.إ{record.price.toFixed(2)}</Text>
      )
    },
    {
      title: 'Payout Amount (AED)',
      key: 'amountAED',
      render: (_: any, record: AppointmentSession) => (
        <Text strong>د.إ{(record.price * paymentPercentage).toFixed(2)}</Text>
      )
    },
    {
      title: 'Payout Amount (USDT)',
      key: 'amountUSDT',
      render: (_: any, record: AppointmentSession) => (
        <Text strong>
          {(record.price * paymentPercentage / exchangeRate).toFixed(6)} USDT
        </Text>
      ),
      hidden: paymentMethod !== "usdt"
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: AppointmentSession) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveSession(record._id)}
          size="small"
        />
      ),
    }
  ].filter(column => !column.hidden);

  // Render payment method specific fields
  const renderPaymentMethodFields = () => {
    switch (paymentMethod) {
      case "manual":
        return (
          <Form.Item label="Manual Transfer Details">
            <Input.TextArea
              placeholder="Enter transfer reference or details"
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              rows={3}
            />
          </Form.Item>
        );
      case "usdt":
        return (
          <>
            <Alert 
              message="Binance USDT Payment" 
              type="info" 
              showIcon 
              className="mb-4"
            />
            <Form.Item label="USDT Wallet Address (BSC Network)">
              <Spin spinning={walletLoading}>
                <Input
                  placeholder="Enter USDT BEP20 address"
                  value={cryptoAddress}
                  onChange={(e) => setCryptoAddress(e.target.value)}
                  status={walletError ? "error" : undefined}
                />
              </Spin>
              {walletError && <Text type="danger">{walletError}</Text>}
            </Form.Item>

            <Card title="Exchange Rate" className="mb-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={manualRate}
                    onChange={handleManualRateChange}
                    placeholder="Enter custom rate"
                    prefix={<BankOutlined />}
                    suffix="AED/USDT"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={applyManualRate}
                    disabled={!manualRate || isNaN(Number(manualRate))}
                  >
                    Apply
                  </Button>
                  <Button 
                    onClick={resetToAutoRate}
                    icon={<ReloadOutlined />}
                    disabled={isLoadingRate}
                  >
                    Refresh
                  </Button>
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-500">
                {usingManualRate 
                  ? "Using manual exchange rate" 
                  : "Live rates provided by ExchangeRate-API"}
              </div>
            </Card>
          </>
        );
      default:
        return null;
    }
  };

  // Calculate totals for display
  const totalOriginalAmount = selectedSessions.reduce((sum, s) => sum + s.price, 0);
  const totalAmountAED = totalAmountAEDPayout.toFixed(2);
  const totalAmountUSDT = (totalAmountAEDPayout / exchangeRate).toFixed(6);

  return (
    <Modal
      title={`Make Payment to ${therapist.therapistName}`}
      open={open}
      onCancel={() => onOpenChange(false)}
      confirmLoading={isLoading || isBinanceLoading}
      width={900}
      footer={[
        <Button key="back" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          loading={isLoading || isBinanceLoading}
          onClick={handleSubmit}
          disabled={
            selectedSessions.length === 0 ||
            (paymentMethod === "manual" && !manualNote.trim()) ||
            (paymentMethod === "usdt" && !cryptoAddress)
          }
        >
          {paymentMethod === "usdt" 
            ? `Pay ${totalAmountUSDT} USDT` 
            : `Process د.إ${totalAmountAED}`}
        </Button>,
      ]}
    >
      <div className="space-y-4">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <Text strong className="text-lg">Selected Sessions ({selectedSessions.length})</Text>
            <Button 
              type="link" 
              danger 
              onClick={handleClearAllSessions}
              disabled={selectedSessions.length === 0}
            >
              Clear All
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Form.Item label="Therapist Level">
              <Select value={therapist.therapistLevel} disabled>
                <Select.Option value={1}>Level 1 (50%)</Select.Option>
                <Select.Option value={2}>Level 2 (57%)</Select.Option>
              </Select>
            </Form.Item>
            
            <Form.Item label="Custom Percentage (%)">
              <InputNumber
                value={customPercentage ?? paymentPercentage * 100}
                min={0}
                max={100}
                onChange={setCustomPercentage}
                style={{ width: '100%' }}
              />
            </Form.Item>
            
            <Form.Item label="Custom Total (AED)">
              <InputNumber
                value={customTotal ?? totalAmountAEDPayout}
                min={0}
                onChange={setCustomTotal}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </div>

          <Table
            columns={sessionColumns}
            dataSource={selectedSessions.map(s => ({
              ...s,
              key: `${s._id.split('-')[0]}-${s.index}`
            }))}
            rowKey="key"
            size="small"
            pagination={false}
            scroll={{ y: 300 }}
          />
        </div>
        
        <Divider />
        
        <Card title="Payment Summary" className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Original Amount (AED)</span>
                <span className="text-lg font-bold">د.إ{totalOriginalAmount.toFixed(2)}</span>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Payout Amount (AED)</span>
                <span className="text-lg font-bold">د.إ{totalAmountAED}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {paymentPercentage * 100}% of original
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Payout Amount (USDT)</span>
                <span className="text-lg font-bold font-mono">
                  {totalAmountUSDT} USDT
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                1 USDT = {exchangeRate.toFixed(4)} AED
              </div>
            </div>
          </div>
        </Card>

        <Form layout="vertical">
          <Form.Item label="Payment Method">
            <Select
              options={paymentMethods}
              value={paymentMethod}
              onChange={setPaymentMethod}
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          {renderPaymentMethodFields()}
        </Form>
      </div>
    </Modal>
  );
}