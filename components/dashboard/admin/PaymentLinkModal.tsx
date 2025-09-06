"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { Spin } from "antd"
import { toast } from "sonner"

interface Payment {
  id: string
  type: 'payment_intent' | 'charge' | 'subscription' | 'invoice'
  amount: number
  currency: string
  created: number
  description: string
  metadata: Record<string, any>
  receipt_url: string | null
  status?: string
  latest_invoice?: string
  current_period_end?: number
}

interface PaymentLinkModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: string
  onSelectPayment: (paymentId: string) => Promise<void>
  currentSessionId?: string
  customerId?: string
  email?: string
}

export default function PaymentLinkModal({
  open,
  onOpenChange,
  patientId,
  onSelectPayment,
  currentSessionId,
  customerId,
  email
}: PaymentLinkModalProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null)
  const [isLinking, setIsLinking] = useState(false)
  const [sortedPayments, setSortedPayments] = useState<Payment[]>([])

  const fetchPayments = async () => {
    if (!patientId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users/patients/verified-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: patientId,
          customerId: customerId,
          email: email
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch payments')
      }

      setPayments(data.payments || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to fetch payments', {
        description: error instanceof Error ? error.message : 'Please try again later'
      })
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setPayments([]);
      fetchPayments();
      setSelectedPayment(null);
    }
  }, [open, patientId]);

  // Sort payments with valid linkable payments first
  useEffect(() => {
    if (payments.length > 0) {
      const sorted = [...payments].sort((a, b) => {
        // Check if payment is linkable (paid/succeeded/active)
        const isALinkable = isPaymentLinkable(a);
        const isBLinkable = isPaymentLinkable(b);
        
        // Valid payments first
        if (isALinkable && !isBLinkable) return -1;
        if (!isALinkable && isBLinkable) return 1;
        
        // Then by date (newest first)
        return b.created - a.created;
      });
      setSortedPayments(sorted);
    }
  }, [payments]);

  const isPaymentLinkable = (payment: Payment) => {
    const status = payment.status || payment.status || '';
    return (payment.type === 'subscription' && status === 'active') ||
      (!['subscription', 'invoice'].includes(payment.type) &&
        ['paid', 'succeeded'].includes(status))
  };

  const getPaymentStatus = (payment: Payment) => {
    const status = payment.status || 'unknown';

   if (payment.type === 'subscription') {
     return status === 'active' ? 'Active Subscription' : `Subscription (${status})`
   }
    
    switch (status) {
      case 'paid':
      case 'succeeded':
        return 'Paid';
      case 'unpaid':
        return 'Unpaid';
      case 'active':
        return 'Active';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusVariant = (payment: Payment) => {
    const status = payment.status || '';

    if (payment.type === 'subscription') {
      return status === 'active' ? 'default' : 'destructive'
    }

    return ['paid', 'succeeded'].includes(status) ? 'default' : 'destructive'
  };

  const handleSelectPayment = async () => {
    if (!selectedPayment) return;
    
    setIsLinking(true);
    try {
      await onSelectPayment(selectedPayment);
      toast.success('Payment linked successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error linking payment:', error);
      toast.error('Failed to link payment', {
        description: error instanceof Error ? error.message : 'Please try again later'
      });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${open ? '' : 'hidden'}`}>
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Link Payment to Appointment</h2>
          <button 
            onClick={() => onOpenChange(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center my-8">
            <Spin size="large" />
          </div>
        ) : sortedPayments?.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No payments found for this patient
          </div>
        ) : (
          <>
            <div className="mb-4">
              <div className="mb-2 text-sm text-gray-600">
                Only completed payments (status: paid/succeeded) and active subscriptions can be linked
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Select</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPayments?.map((payment) => {
                    const isLinkable = isPaymentLinkable(payment);
                    return (
                      <TableRow key={payment.id} className={!isLinkable ? 'opacity-70' : ''}>
                        <TableCell className="capitalize">
                          {payment.type.replace('_', ' ')}
                          {payment.type === 'subscription' && (
                           <span className="block text-xs text-gray-500">Subscription</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(payment.created * 1000), 'MMM d, yyyy h:mm a')}
                        </TableCell>
                        <TableCell>
                          {(payment.amount / 100).toLocaleString('en-US', {
                            style: 'currency',
                            currency: payment.currency?.toUpperCase() || 'USD'
                          })}
                        </TableCell>
                        <TableCell>
                          {payment.description || 'No description'}
                          {payment.metadata?.appointmentId && (
                            <div className="text-xs text-gray-500">
                              Linked to: {payment.metadata.appointmentId}
                            </div>
                          )}
                          {payment.latest_invoice && (
                            <div className="text-xs text-gray-500">
                              Invoice: {payment.latest_invoice.substring(0, 8)}...
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(payment)}>
                            {getPaymentStatus(payment)}
                            {!isLinkable && (
                              <span className="ml-1 text-xs">(cannot link)</span>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => isLinkable && setSelectedPayment(payment.id)}
                            className={`p-2 rounded-full ${
                              selectedPayment === payment.id 
                                ? 'bg-blue-100 text-blue-600' 
                                : 'bg-gray-100'
                            } ${
                              !isLinkable ? 'cursor-not-allowed' : 'cursor-pointer'
                            }`}
                            disabled={!isLinkable}
                          >
                            {selectedPayment === payment.id ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <div className={`h-5 w-5 rounded-full border ${
                                isLinkable ? 'border-gray-300' : 'border-gray-200'
                              }`} />
                            )}
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-4 mt-4">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isLinking}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSelectPayment}
                disabled={!selectedPayment || isLinking}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isLinking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Linking...
                  </>
                ) : (
                  'Link Selected Payment'
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}