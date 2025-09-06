"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, Info } from "lucide-react";

export default function SubscribeResultPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "success" | "failed" | "duplicate">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const statusParam = searchParams.get("status");

    if (statusParam === "duplicate") {
      setStatus("duplicate");
      setErrorMessage("You already have an active subscription for this plan");
      return;
    }

    if (!sessionId) {
      setStatus("failed");
      setErrorMessage("Missing session ID");
      return;
    }

    const confirmSubscription = async () => {
      try {
        const res = await fetch("/api/appointments/payment/confirm-subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        });

        const data = await res.json();

        if (data.success) {
          setStatus("success");
        } else if (data.isDuplicate) {
          setStatus("duplicate");
          setErrorMessage(data.error || "You are already subscribed to this plan");
        } else {
          setStatus("failed");
          setErrorMessage(data.error || "Subscription confirmation failed");
        }
      } catch (err) {
        console.error(err);
        setStatus("failed");
        setErrorMessage("An unexpected error occurred");
      }
    };

    confirmSubscription();
  }, [searchParams]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 mx-auto text-blue-600" />
          <p className="mt-4 text-lg font-medium">Processing your subscription...</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <CheckCircle2 className="w-10 h-10 mx-auto text-green-500" />
          <h1 className="mt-4 text-xl font-semibold">Subscription Successful</h1>
          <p className="text-gray-600">Thank you for subscribing. Your payment was confirmed.</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (status === "duplicate") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Info className="w-10 h-10 mx-auto text-yellow-500" />
          <h1 className="mt-4 text-xl font-semibold">Subscription Already Exists</h1>
          <p className="text-gray-600">{errorMessage}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <XCircle className="w-10 h-10 mx-auto text-red-500" />
        <h1 className="mt-4 text-xl font-semibold">Subscription Failed</h1>
        <p className="text-gray-600">{errorMessage || "We couldn't verify your subscription. Please try again or contact support."}</p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          Return Home
        </button>
      </div>
    </div>
  );
}