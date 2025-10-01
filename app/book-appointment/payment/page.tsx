"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { CreditCard } from "lucide-react";

// Helper function to format dates safely
const formatDate = (date: Date) => {
  try {
    return date.toLocaleDateString();
  } catch (error) {
    // Fallback formatting if locale is not available
    return new Intl.DateTimeFormat('en-US').format(date);
  }
};

const formatTime = (date: Date) => {
  try {
    return date.toLocaleTimeString();
  } catch (error) {
    // Fallback formatting if locale is not available
    return new Intl.DateTimeFormat('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    }).format(date);
  }
};

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [appointment, setAppointment] = useState<any>(null);

  const appointmentId = searchParams.get("appointmentId");

  useEffect(() => {
    if (!appointmentId) {
      router.push("/book-appointment");
      return;
    }

    // Fetch appointment details
    const fetchAppointment = async () => {
      try {
        const response = await fetch(`/api/appointments/${appointmentId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch appointment");
        }
        const data = await response.json();
        setAppointment(data);
      } catch (error) {
        console.error("Error fetching appointment:", error);
        router.push("/book-appointment");
      }
    };

    fetchAppointment();
  }, [appointmentId, router]);

  const handlePayment = async () => {
    if (!appointmentId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch("/api/appointments/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ appointmentId }),
      });

      if (!response.ok) {
        throw new Error("Payment failed");
      }

      const { clientSecret } = await response.json();
      router.push(`/payment?client_secret=${clientSecret}`);
    } catch (error) {
      console.error("Payment error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!appointment) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <Card className="p-8 bg-white shadow-xl rounded-2xl border border-blue-100">
          <h1 className="text-3xl font-extrabold text-center mb-8 text-blue-900 tracking-tight">
            Secure Payment
          </h1>
          <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h3 className="font-semibold text-blue-900">Appointment Details</h3>
            <div className="mt-2 text-base text-blue-800 space-y-1">
              <p>Date: <span className="font-medium">{formatDate(new Date(appointment.date))}</span></p>
              <p>Time: <span className="font-medium">{formatTime(new Date(appointment.date))}</span></p>
              <p>Plan: <span className="font-medium">{appointment.plan}</span></p>
              <p className="mt-2 text-lg font-bold text-blue-700">
                Amount: <img src="/assets/icons/AED.png" alt="AED" className="inline-block h-5 w-5 -mt-0.5" />
                {appointment.price}
              </p>
            </div>
          </div>
          <div className="text-center mt-8">
            <Button
              onClick={handlePayment}
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold text-lg shadow-md transition-all duration-200"
            >
              {isLoading ? (
                <span className="flex items-center justify-center"><span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>Processing...</span>
              ) : (
                <span className="flex items-center justify-center"><CreditCard className="h-5 w-5 mr-2" />Pay Now</span>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
