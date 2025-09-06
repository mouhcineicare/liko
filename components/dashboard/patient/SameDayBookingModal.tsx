'use client'

import { useState } from "react";
import { Modal, Button, Card, Typography, Row, Col, Alert } from "antd";
import { format } from "date-fns";
import { Clock, CreditCard, Wallet, AlertTriangle } from "lucide-react";
import { SAME_DAY_PRICING } from "@/lib/constants/plans";

interface SameDayBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  selectedTime: string;
  sessionBalance: number;
  onUseBalance: () => void;
  onPayNow: () => void;
  onPayRemaining?: () => void;
  isLoading?: boolean;
  isReschedule?: boolean;
}

export default function SameDayBookingModal({
  open,
  onOpenChange,
  selectedDate,
  selectedTime,
  sessionBalance,
  onUseBalance,
  onPayNow,
  onPayRemaining,
  isLoading = false,
  isReschedule = false
}: SameDayBookingModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const basePrice = SAME_DAY_PRICING.BASE_PRICE;
  const surcharge = basePrice * (SAME_DAY_PRICING.SURCHARGE_MULTIPLIER - 1);
  const totalPrice = basePrice + surcharge;

  const handleUseBalance = async () => {
    setIsProcessing(true);
    try {
      await onUseBalance();
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayNow = async () => {
    setIsProcessing(true);
    try {
      await onPayNow();
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayRemaining = async () => {
    setIsProcessing(true);
    try {
      await onPayRemaining?.();
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return format(date, 'h:mm a');
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <span>Same-Day Booking</span>
        </div>
      }
      open={open}
      onCancel={() => onOpenChange(false)}
      footer={null}
      className="same-day-booking-modal"
      width={500}
      destroyOnClose
    >
      <div className="space-y-6">
        {/* Warning Alert */}
        <Alert
          message="Same-Day Booking Notice"
          description="You're booking within 24 hours, which incurs a 64% surcharge. This helps ensure therapist availability for urgent appointments."
          type="warning"
          showIcon
          className="mb-4"
        />

        {/* Session Details */}
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <Typography.Title level={5} className="!mb-0 text-blue-900">
              Session Details
            </Typography.Title>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Time:</span>
              <span className="font-medium">{formatTime(selectedTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <span className="font-medium text-orange-600">
                {isReschedule ? 'Reschedule' : 'New Booking'} (Same-Day)
              </span>
            </div>
          </div>
        </Card>

        {/* Pricing Breakdown */}
        <Card className="bg-gray-50 border-gray-200">
          <Typography.Title level={5} className="!mb-4 text-gray-900">
            Pricing Breakdown
          </Typography.Title>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Base Session Price:</span>
              <span className="font-medium">{basePrice} AED</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Same-Day Surcharge ({SAME_DAY_PRICING.SURCHARGE_PERCENTAGE}%):</span>
              <span className="font-medium text-orange-600">+{surcharge} AED</span>
            </div>
            <div className="border-t border-gray-300 pt-2 mt-3">
              <div className="flex justify-between">
                <span className="text-lg font-semibold text-gray-900">Total Price:</span>
                <span className="text-lg font-bold text-orange-600">{totalPrice} AED</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Balance Info */}
        <Card className="bg-green-50 border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="w-5 h-5 text-green-600" />
            <Typography.Title level={5} className="!mb-0 text-green-900">
              Your Balance
            </Typography.Title>
          </div>
          <div className="text-2xl font-bold text-green-900 mb-2">
            {sessionBalance.toFixed(2)} AED
          </div>
          <div className="text-sm text-green-700">
            {sessionBalance >= totalPrice 
              ? "You have sufficient balance for this booking"
              : `You need ${(totalPrice - sessionBalance).toFixed(2)} AED more`
            }
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          {sessionBalance >= totalPrice ? (
            <Button
              type="primary"
              size="large"
              onClick={handleUseBalance}
              loading={isProcessing && isLoading}
              className="w-full h-12 bg-green-600 hover:bg-green-700 border-green-600 hover:border-green-700"
              icon={<Wallet className="w-5 h-5" />}
            >
              Use Balance ({totalPrice} AED)
            </Button>
          ) : (
            <Button
              type="primary"
              size="large"
              onClick={handlePayRemaining}
              loading={isProcessing && isLoading}
              className="w-full h-12 bg-orange-600 hover:bg-orange-700 border-orange-600 hover:border-orange-700"
              icon={<Wallet className="w-5 h-5" />}
            >
              Pay Remaining ({(totalPrice - sessionBalance).toFixed(2)} AED)
            </Button>
          )}

          <Button
            size="large"
            onClick={handlePayNow}
            loading={isProcessing && isLoading}
            className="w-full h-12 border-blue-600 text-blue-600 hover:bg-blue-50"
            icon={<CreditCard className="w-5 h-5" />}
          >
            Pay Full Amount with Stripe ({totalPrice} AED)
          </Button>
        </div>

        {/* Cancellation Policy */}
        <Alert
          message="Cancellation Policy"
          description="Same-day bookings have a 24-hour cancellation policy. Cancellations within 24 hours may incur additional charges."
          type="info"
          showIcon
          className="text-xs"
        />
      </div>
    </Modal>
  );
}