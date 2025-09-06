import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import stripe from '@/lib/stripe';

const PaymentStatusBadge = ({ sessionId }: { sessionId: string }) => {
  const [paymentStatus, setPaymentStatus] = useState<string>('checking...');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        setPaymentStatus(session.payment_status);
      } catch (error) {
        console.error('Error checking payment status:', error);
        setPaymentStatus('error');
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [sessionId]);

  if (isLoading) {
    return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Checking...</Badge>;
  }

  switch (paymentStatus.toLowerCase()) {
    case 'paid':
      return <Badge className="bg-green-100 text-green-800 border-green-200">Paid</Badge>;
    case 'unpaid':
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Unpaid</Badge>;
    case 'no_payment_required':
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Free</Badge>;
    default:
      return <Badge className="bg-red-100 text-red-800 border-red-200">Error</Badge>;
  }
};

export default PaymentStatusBadge;