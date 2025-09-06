"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

export default function GoogleCallback() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    
    if (code && state && window.opener) {
      // Send both code and state back to opener
      window.opener.postMessage({
        type: "GOOGLE_OAUTH_CALLBACK",
        code,
        state
      }, window.location.origin);
      window.close();
    }
  }, [searchParams]);

  return (
    <Suspense fallback={<div>Loading...</div>}>
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold mb-2">Connecting to Google Calendar</h1>
        <p>Please wait while we complete the connection...</p>
      </div>
    </div>
    </Suspense>
  );
}