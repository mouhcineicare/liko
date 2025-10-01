"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { useSession, signIn } from "next-auth/react";

// Helper function to format dates safely
const formatDate = (date: Date) => {
  try {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch (error) {
    // Fallback formatting if locale is not available
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
  }
};

const formatTime = (date: Date) => {
  try {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  } catch (error) {
    // Fallback formatting if locale is not available
    const options: Intl.DateTimeFormatOptions = { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
  }
};

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
            <h3 className="font-medium text-gray-900">
              {appointment.recurring && appointment.recurring.length > 0 
                ? `You're booking a recurring session with the following times:`
                : `Your booking session on this day`
              }
            </h3>
            
            {/* Session Details */}
            <div className="mt-4 space-y-3">
              {/* Main Session */}
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                <div className="mt-1 w-2 h-2 rounded-full bg-blue-500"></div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">
                    Session 1 - {formatDate(new Date(appointment.date))}
                  </p>
                  <p className="text-sm text-gray-600">
                    at {formatTime(new Date(appointment.date))}
                  </p>
                </div>
              </div>

              {/* Recurring Sessions */}
              {appointment.recurring && appointment.recurring.length > 0 && (
                <div className="space-y-2 pl-2 border-l-2 border-gray-200">
                  {appointment.recurring.map((session: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                      <div className="mt-1 w-2 h-2 rounded-full bg-gray-400"></div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">
                          Session {index + 2} - {formatDate(new Date(session.date))}
                        </p>
                        <p className="text-sm text-gray-600">
                          at {formatTime(new Date(session.date))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Package Summary */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-blue-900">Plan: {appointment.plan}</p>
                  <p className="text-sm text-blue-700">
                    {appointment.recurring && appointment.recurring.length > 0 
                      ? `${appointment.recurring.length + 1} Sessions Package`
                      : '1 Session'
                    }
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-blue-900">
                    د.إ{appointment.price}
                  </p>
                  {appointment.recurring && appointment.recurring.length > 0 && (
                    <p className="text-sm text-blue-700">
                      د.إ{(appointment.price / (appointment.recurring.length + 1)).toFixed(2)} per session
                    </p>
                  )}
                </div>
              </div>
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