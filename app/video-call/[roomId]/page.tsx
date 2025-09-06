"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default function VideoCallPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    // Redirect to Google Meet
    const meetCode = params.roomId;
    window.location.href = `https://meet.google.com/${meetCode}`;
  }, [params.roomId]);

  return (
    <div className="min-h-screen bg-gray-900 p-4 flex items-center justify-center">
      <Card className="max-w-md w-full p-6 bg-gray-800 text-white">
        <h1 className="text-xl font-semibold mb-4">Redirecting to Google Meet...</h1>
        <p className="text-gray-300 mb-6">
          You will be automatically redirected to your Google Meet session. If you are not redirected, please click the button below.
        </p>
        <Button
          onClick={() => window.location.href = `https://meet.google.com/${params.roomId}`}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Join Google Meet
        </Button>
      </Card>
    </div>
  );
}