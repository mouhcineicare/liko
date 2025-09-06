"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";

export default function GoogleCallback() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      getRefreshToken(code);
    }
  }, [searchParams]);

  const getRefreshToken = async (code: string) => {
    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      if (data.refreshToken) {
        console.log("Your refresh token is:", data.refreshToken);
      }
    } catch (error) {
      console.error("Error getting refresh token:", error);
    }
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6">
        <h1 className="text-xl font-semibold mb-4">Google Authorization</h1>
        <p className="text-gray-600">
          Processing authorization... Check the console for your refresh token.
        </p>
      </Card>
    </div>
    </Suspense>
  );
}
