"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import BalanceStatus from "@/components/payment/BalanceStatus";

declare const gtag: typeof window.gtag;

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const appointmentId = searchParams.get("appointmentId");
  const paymentType = searchParams.get("type");
  const sessionId = searchParams.get("session_id");
  const sessions = searchParams.get("sessions");
  const [isUpdating, setIsUpdating] = useState(false);
  const hasUpdated = useRef(false); // Track if we've already updated

  const trackPaymentConfirmation = async () => {
    const amount = searchParams.get('amount');
    const currency = searchParams.get('currency') || 'AED';
    
    if (amount) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'purchase',
        transactionValue: parseFloat(amount),
        transactionCurrency: currency
      });
      
      if (typeof gtag === 'function') {
        gtag('event', 'purchase', {
          transaction_id: searchParams.get('payment_id') || sessionId || 'N/A',
          value: amount,
          currency: currency,
          items: []
        });
      }
    }
  };

  const updatePackageBalance = async () => {
    if (hasUpdated.current) return; // Skip if already updated
    
    try {
      setIsUpdating(true);
      hasUpdated.current = true; // Mark as updated
      
      const response = await fetch('/api/patient/balance/verify-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) {
        throw new Error("Failed to verify package purchase");
      }

      const data = await response.json();
      
      if (data.sessionsAdded !== parseInt(sessions || '0')) {
        throw new Error("Incorrect number of sessions added");
      }

      toast.success(`Successfully added ${data.sessionsAdded} sessions to your balance!`);
    } catch (error) {
      console.error("Error updating balance:", error);
      toast.error("Payment was successful but balance update failed");
    } finally {
      setIsUpdating(false);
    }
  };

  const updateAppointmentStatus = async () => {
    if (hasUpdated.current) return;
    
    try {
      setIsUpdating(true);
      hasUpdated.current = true;
      
      console.log('Success page: Checking appointment status for ID:', appointmentId);
      
      // Instead of manually updating, just check the status and wait for webhook
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch appointment status");
      }

      const result = await response.json();
      console.log('Success page: Current appointment status:', result);
      console.log('Success page: Payment status:', result.paymentStatus);
      console.log('Success page: Appointment status:', result.status);
      console.log('Success page: Checkout session ID:', result.checkoutSessionId);
      
      // If payment is already completed (by webhook), show success
      if (result.paymentStatus === 'completed' && result.isStripeVerified) {
        console.log('Payment already processed by webhook, showing success');
        toast.success("Payment completed successfully!");
        setTimeout(() => {
          // Use router.push instead of window.location.href to maintain session
          router.push("/dashboard/patient");
          router.refresh(); // Refresh the data
        }, 3000); // Increased delay to allow webhook processing
        return; // Exit early, don't try to fix
      } else if (result.paymentStatus === 'completed' && !result.isStripeVerified) {
        // Payment marked as completed but not verified by Stripe, try to fix
        console.log('Payment completed but not Stripe verified, attempting fix');
        toast.success("Payment successful! Verifying with Stripe...");
      } else {
        // Payment not completed yet, try to fix it automatically
        console.log('Payment not completed yet, attempting fix');
        toast.success("Payment successful! Processing...");
      }
      
      // Try to fix the payment status automatically
      try {
        const fixResponse = await fetch(`/api/appointments/${appointmentId}/fix-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            sessionId: sessionId,
            appointmentId: appointmentId 
          }),
        });
        
        if (fixResponse.ok) {
          const fixResult = await fixResponse.json();
          if (fixResult.success) {
            if (fixResult.alreadyProcessed) {
              console.log('Payment was already processed by webhook');
              toast.success("Payment completed successfully!");
            } else {
              console.log('Payment fixed successfully');
              toast.success("Payment processed successfully!");
            }
            setTimeout(() => {
              // Use router.push instead of window.location.href to maintain session
              router.push("/dashboard/patient");
              router.refresh(); // Refresh the data
            }, 3000); // Increased delay to allow webhook processing
          } else {
            toast.success("Payment successful! Please refresh the page to see updated status.");
          }
        } else {
          // Fallback: wait a bit for webhook and then check again
          console.log('Fix-payment failed, waiting for webhook');
          setTimeout(async () => {
            try {
              const retryResponse = await fetch(`/api/appointments/${appointmentId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
              });
              if (retryResponse.ok) {
                const retryResult = await retryResponse.json();
                if (retryResult.paymentStatus === 'completed') {
                  toast.success("Payment processed successfully!");
                  setTimeout(() => {
                    window.location.href = "/dashboard/patient";
                  }, 2000);
                } else {
                  toast.success("Payment successful! Please refresh the page to see updated status.");
                }
              }
            } catch (error) {
              console.error("Error checking payment status:", error);
              toast.success("Payment successful! Please refresh the page to see updated status.");
            }
          }, 2000);
        }
      } catch (error) {
        console.error("Error fixing payment status:", error);
        toast.success("Payment successful! Please refresh the page to see updated status.");
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
      toast.success("Payment successful! Please refresh the page to see updated status.");
      setTimeout(() => {
        window.location.href = "/dashboard/patient";
      }, 2000);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    trackPaymentConfirmation();

    // Debug logging
    console.log('Success page: Payment type:', paymentType);
    console.log('Success page: Session ID:', sessionId);
    console.log('Success page: Appointment ID:', appointmentId);
    console.log('Success page: Sessions:', sessions);

    if (paymentType === 'package' && sessionId) {
      updatePackageBalance();
    } else if (paymentType === 'renew_now' && sessionId) {
      // For renew_now, just redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/dashboard/patient");
      }, 3000);
    } else if (appointmentId) {
      updateAppointmentStatus();
    } else {
      console.log('Success page: No specific payment type, redirecting to dashboard');
      router.push("/dashboard/patient");
    }
  }, []);

  // Show different UI based on payment type
  if (paymentType === 'renew_now') {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center font-sans-serif p-20">
        <div className="text-center max-w-md p-6 bg-white rounded-lg">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Subscription Renewed!</h1>
          <p className="text-gray-400 mb-4 text-base">
            Your subscription has been renewed and sessions have been added to your balance.
          </p>
          <p className="text-gray-600 mb-6 text-sm font-medium">
            Please use "Rebook Session" and use your balance to book your future sessions.
          </p>
          <p className="text-gray-400 text-xs">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Keep the same UI for appointment payments
  if (!paymentType || paymentType !== 'package') {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center font-sans-serif p-20">
        <div className="text-center max-w-md p-6 bg-white rounded-lg">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h1>
          <p className="text-gray-400 mb-6 text-base">
            Thank you for your payment. Your appointment has been confirmed.
          </p>
          {isUpdating && (
            <p className="text-sm text-gray-500 mb-4">Updating your appointment status...</p>
          )}
          <button
            onClick={() => router.push("/dashboard/patient")}
            className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
            disabled={isUpdating}
          >
            {isUpdating ? "Processing..." : "Return to Dashboard"}
          </button>

          {!isUpdating && (
            <button
              onClick={() => router.push("/dashboard/patient/sessions-rebooking")}
              className="mt-3 px-4 py-2 bg-green-500 text-white rounded-md text-sm hover:bg-green-700 transition-colors block w-full"
            >
              Book More Sessions
            </button>
          )}
        </div>
      </div>
    );
  }

  // New UI for package purchases
  return (
    <div className="min-h-full bg-gray-50 flex items-center justify-center font-sans-serif p-20">
      <div className="text-center max-w-md p-6 bg-white rounded-lg">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Purchase Successful!</h1>
        <p className="text-gray-400 mb-6 text-base">
          Thank you for your purchase. Your session balance has been updated.
        </p>

        {sessions && (
          <div className="mb-4">
            <p className="text-lg font-medium text-gray-700">
              Added to your balance:
            </p>
            <p className="text-2xl font-bold text-green-600">
              +{sessions} session{sessions !== "1" ? 's' : ''}
            </p>
          </div>
        )}

        <div className="mb-4">
          <BalanceStatus />
        </div>

        {isUpdating && (
          <p className="text-sm text-gray-500 mb-4">
            Updating your session balance...
          </p>
        )}

        <button
          onClick={() => router.push("/dashboard/patient")}
          className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
          disabled={isUpdating}
        >
          {isUpdating ? "Processing..." : "Return to Dashboard"}
        </button>

        {!isUpdating && (
          <button
            onClick={() => router.push("/dashboard/patient/sessions-rebooking")}
            className="mt-3 px-4 py-2 bg-green-500 text-white rounded-md text-sm hover:bg-green-700 transition-colors block w-full"
          >
            Book Sessions Now
          </button>
        )}
      </div>
    </div>
  );
}