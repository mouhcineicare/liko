"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, update } = useSession();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(3);

  const verifyToken = useCallback(async (token: string) => {
    try {
      setStatus("loading");
      
      const response = await fetch(`/api/auth/verify?token=${token}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      // Only update if not already verified
      if (!(session?.user?.status === 'active')) {
        await update({
          user: {
            ...session?.user,
            status: 'active',
          }
        });
      }

      setStatus("success");
      
      // Countdown before redirect
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push("/dashboard");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "Failed to verify email");
    }
  }, [router, update, session]);

  useEffect(() => {
    const token = searchParams.get("token");
    
    // If no token or already verified, redirect immediately
    if (!token || session?.user?.status === 'active') {
      router.push("/dashboard");
      return;
    }

    // Only verify if we're in idle state
    if (status === "idle") {
      verifyToken(token);
    }
  }, [searchParams, router, status, verifyToken, session]);

  // If redirecting, show nothing
  if (!searchParams.get("token")) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md p-6">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            <h1 className="text-2xl font-bold">Verifying Your Email</h1>
            <p className="text-gray-600">Please wait while we verify your email address...</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <h1 className="text-2xl font-bold">Email Verified!</h1>
            <p className="text-gray-600">
              Redirecting in {countdown} seconds...
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
              <div 
                className="bg-green-500 h-2.5 rounded-full transition-all duration-1000" 
                style={{ width: `${(countdown/3)*100}%` }}
              ></div>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4">
            <XCircle className="h-12 w-12 text-red-500" />
            <h1 className="text-2xl font-bold">Verification Failed</h1>
            <p className="text-red-500 text-center">{error}</p>
            <Button 
              onClick={() => router.push("/login")}
              className="mt-4"
            >
              Return to Login
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}