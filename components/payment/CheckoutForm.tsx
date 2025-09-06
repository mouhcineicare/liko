// components/CheckoutForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CheckoutForm({ appointmentId }: { appointmentId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/patient`,
        },
        redirect: "if_required",
      });

      if (result.error) {
        setError(result.error.message ?? "An unexpected error occurred");
        toast.error(result.error.message ?? "Payment failed");
        return;
      }

      if (result.paymentIntent?.status === "succeeded") {
        const response = await fetch(`/api/appointments/${appointmentId}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "pending_approval",
            paymentStatus: "completed"
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update appointment status");
        }

        toast.success("Payment successful!");
        router.push("/dashboard/patient");
      }
    } catch (error: any) {
      setError(error.message ?? "An unexpected error occurred");
      toast.error("Payment failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {error && <div className="text-red-500 text-sm">{error}</div>}
      
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {isProcessing ? "Processing..." : "Pay Now"}
      </Button>
    </form>
  );
}