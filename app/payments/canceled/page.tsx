"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { XCircle } from "lucide-react";

export default function PaymentCanceledPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const appointmentId = searchParams.get("appointmentId");
  const paymentType = searchParams.get("type");

  useEffect(() => {
    if (paymentType === 'package') {
      toast.error("Package purchase was canceled");
      return;
    }

    if (!appointmentId) {
      router.push("/dashboard/patient");
      return;
    }

    const updatePaymentStatus = async () => {
      try {
        await fetch(`/api/appointments/${appointmentId}/paymentStatus`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ paymentStatus: "pending" }),
        });
        toast.error("Payment was canceled");
      } catch (error) {
        console.error("Error updating payment status:", error);
      }
    };

    updatePaymentStatus();
  }, [appointmentId, router, paymentType]);

  const getTryAgainPath = () => {
    if (paymentType === 'package') return "/dashboard/patient/sessions";
    if (appointmentId) return `/payment?appointmentId=${appointmentId}`;
    return "/dashboard/patient";
  };

  return (
    <div className="min-h-full bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md p-6 bg-white rounded-lg">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {paymentType === 'package' ? 'Purchase Canceled' : 'Payment Canceled'}
        </h1>
        <p className="text-gray-500 mb-6 text-sm">
          {paymentType === 'package'
            ? 'Your session package purchase was not completed. No charges have been made.'
            : 'Your payment was not completed. You can try again if you wish.'}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push(getTryAgainPath())}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => router.push("/dashboard/patient")}
            className="px-4 py-2 bg-gray-200 text-gray-800 text-sm rounded-md hover:bg-gray-300 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}