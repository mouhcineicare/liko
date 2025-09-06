"use client"

import { useState, useEffect } from "react"
import { 
  Modal, 
  Button, 
  Card, 
  Spin, 
  message,
  Space,
  Typography,
  Divider,
  Alert,
  Tag,
  Tooltip
} from "antd"
import { 
  CopyOutlined, 
  CheckOutlined, 
  CreditCardOutlined, 
  LinkOutlined, 
  CalendarOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  WalletOutlined
} from "@ant-design/icons"
const { Text } = Typography

interface PaymentDetailsDialogProps {
  therapistId: string
  therapistName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface PayoutInfo {
  _id: string
  therapist: {
    _id: string
    name: string
    email?: string
  }
  bankDetails?: {
    accountName: string
    accountNumber: string
    routingNumber: string
    swiftCode: string
    bankName: string
  }
  cryptoWallet?: {
    address: string
    currency: 'USDT' | 'USDC'
  }
  paymentLink?: string
  lastUpdated: string
  payoutSettings?: {
    schedule: 'manual' | 'weekly' | 'biweekly' | 'monthly'
    minimumAmount?: number
    nextPayoutDate?: string
    payoutFrequency?: string
    expectedPayoutDate?: string
  }
}

export default function PaymentDetailsDialog({
  therapistId,
  therapistName,
  open,
  onOpenChange,
}: PaymentDetailsDialogProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payoutInfo, setPayoutInfo] = useState<PayoutInfo | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const fetchPayoutInfo = async () => {
    if (!open || !therapistId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/users/therapists/${therapistId}/payment-details`)

      if (!response.ok) {
        throw new Error("Failed to fetch payout information")
      }

      const data = await response.json()
      setPayoutInfo(data.payoutInfo)
    } catch (error) {
      console.error("Error fetching payout info:", error)
      setError("Failed to load payout information")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchPayoutInfo()
    }
  }, [open, therapistId])

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return

    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedField(fieldName)
        message.success(`${fieldName} copied to clipboard`)

        setTimeout(() => {
          setCopiedField(null)
        }, 2000)
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err)
        message.error("Failed to copy to clipboard")
      })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatPayoutSchedule = (schedule: string) => {
    switch (schedule) {
      case 'weekly': return 'Weekly'
      case 'biweekly': return 'Bi-weekly'
      case 'monthly': return 'Monthly'
      default: return 'Manual'
    }
  }

  const renderBankDetails = () => {
    if (!payoutInfo?.bankDetails || Object.values(payoutInfo.bankDetails).every((val) => !val)) {
      return <Text type="secondary">No bank details provided</Text>
    }

    const fields = [
      { label: "Account Name", value: payoutInfo.bankDetails.accountName },
      { label: "Account Number", value: payoutInfo.bankDetails.accountNumber },
      { label: "Routing Number", value: payoutInfo.bankDetails.routingNumber },
      { label: "SWIFT Code", value: payoutInfo.bankDetails.swiftCode },
      { label: "Bank Name", value: payoutInfo.bankDetails.bankName }
    ]

    return (
      <Space direction="vertical" size="middle" className="w-full">
        {fields.map((field) => (
          field.value && (
            <div key={field.label} className="flex justify-between items-center">
              <div>
                <Text strong>{field.label}</Text>
                <div><Text>{field.value}</Text></div>
              </div>
              <Button
                type="text"
                icon={copiedField === field.label ? <CheckOutlined className="text-green-500" /> : <CopyOutlined />}
                onClick={() => copyToClipboard(field.value, field.label)}
              />
            </div>
          )
        ))}
      </Space>
    )
  }

  const renderCryptoWallet = () => {
    if (!payoutInfo?.cryptoWallet?.address) {
      return <Text type="secondary">No crypto wallet provided</Text>
    }

    return (
      <Space direction="vertical" size="middle" className="w-full">
        <div className="flex justify-between items-center">
          <div>
            <Text strong>Wallet Address</Text>
            <div>
              <Text>{payoutInfo.cryptoWallet.address}</Text>
              {payoutInfo.cryptoWallet.currency && (
                <Tag color="blue" className="ml-2">
                  {payoutInfo.cryptoWallet.currency}
                </Tag>
              )}
            </div>
          </div>
          <Button
            type="text"
            icon={copiedField === "Wallet Address" ? <CheckOutlined className="text-green-500" /> : <CopyOutlined />}
            onClick={() => copyToClipboard(payoutInfo.cryptoWallet?.address || '', "Wallet Address")}
          />
        </div>
      </Space>
    )
  }

  const renderPayoutSettings = () => {
    if (!payoutInfo?.payoutSettings) {
      return null
    }

    return (
      <Space direction="vertical" size="middle" className="w-full">
        <div>
          <Text strong>Payout Schedule</Text>
          <div>
            <Text>{formatPayoutSchedule(payoutInfo.payoutSettings.schedule || 'manual')}</Text>
          </div>
        </div>

        {payoutInfo.payoutSettings.expectedPayoutDate && (
          <div>
            <Text strong>Next Expected Payout</Text>
            <div>
              <Text>{formatDate(payoutInfo.payoutSettings.expectedPayoutDate)}</Text>
            </div>
          </div>
        )}

        {payoutInfo.payoutSettings.minimumAmount && (
          <div>
            <Text strong>Minimum Payout Amount</Text>
            <div>
              <Text>{payoutInfo.payoutSettings.minimumAmount}</Text>
            </div>
          </div>
        )}
      </Space>
    )
  }

  return (
    <Modal
      title={
        <Space>
          <CreditCardOutlined />
          <span>Payout Information</span>
        </Space>
      }
      open={open}
      onCancel={() => onOpenChange(false)}
      onOk={() => onOpenChange(false)}
      width={800}
      footer={[
        <Button key="close" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      ]}
    >
      <Text type="secondary">View payout information for {therapistName}</Text>
      <Divider />

      {isLoading ? (
        <div className="text-center py-8">
          <Spin size="large" tip="Loading payout information..." />
        </div>
      ) : error ? (
        <Alert
          message="Error Loading Payout Information"
          description={error}
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
          action={
            <Button type="primary" onClick={fetchPayoutInfo}>
              Retry
            </Button>
          }
        />
      ) : !payoutInfo ? (
        <Space direction="vertical" align="center" className="w-full py-8">
          <CreditCardOutlined className="text-4xl text-yellow-500" />
          <Text strong>No Payout Information Found</Text>
          <Text type="secondary">This therapist hasn't provided any payout information yet.</Text>
        </Space>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto">
          <Card 
            title={
              <Space>
                <CreditCardOutlined />
                <span>Bank Details</span>
              </Space>
            }
            className="mb-4"
          >
            {renderBankDetails()}
          </Card>

          <Card 
            title={
              <Space>
                <WalletOutlined />
                <span>Crypto Wallet</span>
              </Space>
            }
            className="mb-4"
          >
            {renderCryptoWallet()}
          </Card>

          {payoutInfo.paymentLink && (
            <Card
              title={
                <Space>
                  <LinkOutlined />
                  <span>Payment Link</span>
                </Space>
              }
              className="mb-4"
            >
              <div className="flex justify-between items-center">
                <Text ellipsis={{ tooltip: payoutInfo.paymentLink }} className="w-3/4">
                  {payoutInfo.paymentLink}
                </Text>
                <Space>
                  <Button
                    type="text"
                    icon={copiedField === "Payment Link" ? <CheckOutlined className="text-green-500" /> : <CopyOutlined />}
                    onClick={() => copyToClipboard(payoutInfo.paymentLink || '', "Payment Link")}
                  />
                  <Button 
                    type="primary" 
                    onClick={() => window.open(payoutInfo.paymentLink, "_blank")}
                  >
                    Open
                  </Button>
                </Space>
              </div>
            </Card>
          )}

          <Card
            title={
              <Space>
                <CalendarOutlined />
                <span>Payout Settings</span>
              </Space>
            }
            className="mb-4"
          >
            {renderPayoutSettings()}
          </Card>

          <div className="flex items-center text-gray-500 mt-4">
            <CalendarOutlined className="mr-2" />
            <Text type="secondary">Last updated: {formatDate(payoutInfo.lastUpdated)}</Text>
          </div>
        </div>
      )}
    </Modal>
  )
}