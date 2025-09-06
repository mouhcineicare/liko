"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { useSession, signIn } from "next-auth/react";

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const appointmentId = searchParams.get("appointmentId");
  const [appointment, setAppointment] = useState<any>(null);

  // Silent auto sign-in function
  const attemptAutoSignIn = async () => {
    // Check if we have stored credentials from account creation
    const storedEmail = localStorage.getItem('temp_user_email');
    const storedPassword = localStorage.getItem('temp_user_password');
    
    if (storedEmail && storedPassword) {
      try {
        const result = await signIn('credentials', {
          email: storedEmail,
          password: storedPassword,
          redirect: false,
        });
        
        if (result?.error) {
          console.error('Auto sign-in failed:', result.error);
          // Clear stored credentials and redirect to signin
          localStorage.removeItem('temp_user_email');
          localStorage.removeItem('temp_user_password');
          const returnUrl = `/payment?appointmentId=${appointmentId}`;
          router.push(`/auth/signin?callbackUrl=${encodeURIComponent(returnUrl)}&email=${encodeURIComponent(storedEmail)}`);
        } else {
          // Clear stored credentials on success
          localStorage.removeItem('temp_user_email');
          localStorage.removeItem('temp_user_password');
        }
      } catch (error) {
        console.error('Auto sign-in error:', error);
        localStorage.removeItem('temp_user_email');
        localStorage.removeItem('temp_user_password');
        const returnUrl = `/payment?appointmentId=${appointmentId}`;
        router.push(`/auth/signin?callbackUrl=${encodeURIComponent(returnUrl)}`);
      }
    } else {
      // No stored credentials, redirect to signin
      const returnUrl = `/payment?appointmentId=${appointmentId}`;
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(returnUrl)}`);
    }
  };

  useEffect(() => {
    // Check authentication status
    if (status === "loading") {
      return; // Still loading
    }

    if (status === "unauthenticated") {
      // Try auto sign-in first
      attemptAutoSignIn();
      return;
    }

    if (!appointmentId) {
      router.push("/dashboard/patient");
      return;
    }

    const fetchAppointment = async () => {
      try {
        const response = await fetch(`/api/appointments/${appointmentId}`);
        if (!response.ok) throw new Error("Failed to fetch appointment");
        const data = await response.json();
        setAppointment(data);
      } catch (error) {
        console.error("Error fetching appointment:", error);
        toast.error("Failed to load appointment details");
      }
    };

    if (status === "authenticated" && appointmentId) {
      fetchAppointment();
    }

    const initializeCheckout = async () => {
      try {
        const response = await fetch("/api/appointments/payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ appointmentId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Payment API error response:", errorData);
          throw new Error(`Failed to initialize checkout: ${errorData.error || 'Unknown error'}`);
        }

        const data = await response.json();
        console.log("Payment API success response:", data);
        
        // Redirect to Stripe's hosted checkout page
        if(data.redirectUrl){
          console.log("Redirecting to Stripe checkout:", data.redirectUrl);
          window.location.href = data.redirectUrl;
        } else {
          console.log("No redirect URL provided, going to dashboard");
          router.push("/dashboard/patient");
        }
      } catch (error) {
        console.error("Checkout initialization error:", error);
        console.error("Error details:", error.message);
        toast.error(`Failed to initialize checkout: ${error.message}`);
        router.push("/dashboard/patient");
      } finally {
        setIsLoading(false);
      }
    };

    // Only initialize checkout if user is authenticated and appointment is loaded
    if (status === "authenticated" && appointment) {
      initializeCheckout();
    }
  }, [appointmentId, router, status, appointment]);

  // Only show loading if we're actually loading the appointment data
  if (isLoading && !appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <Card className="p-6 bg-white">
          <h1 className="text-2xl font-bold text-center mb-6 text-black">
            Redirecting to Secure Payment
          </h1>
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">Appointment Details</h3>
            <div className="mt-2 text-sm text-gray-600">
              <p>Date: {new Date(appointment.date).toLocaleDateString()}</p>
              <p>Time: {new Date(appointment.date).toLocaleTimeString()}</p>
              <p>Plan: {appointment.plan}</p>
              <p className="mt-2 text-lg font-semibold">Amount: د.إ{appointment.price}</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-gray-600">You will be redirected to Stripe&apos;s secure payment page shortly...</p>
          </div>
        </Card>
      </div>
    </div>
  );
}