"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RocketIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function PayoutAlert() {
  const { data: session } = useSession();
  const [payoutData, setPayoutData] = useState<{
    expectedPayoutDate: string;
    payoutFrequency: string;
    totalPaid: number;
    totalPending: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchPayoutData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/therapist/payout");
        if (!response.ok) {
          throw new Error("Failed to fetch payout data");
        }
        const data = await response.json();
        setPayoutData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchPayoutData();
  }, [session?.user?.id]);

  if (loading) {
    return (
      <Alert className="mb-4 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <RocketIcon className="h-5 w-5 text-blue-500" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-3 w-[250px]" />
            </div>
          </div>
          <Skeleton className="h-9 w-[100px]" />
        </div>
      </Alert>
    );
  }

  if (error || !payoutData) {
    return null; // Don't show anything if there's an error
  }

  const { expectedPayoutDate, payoutFrequency, totalPaid, totalPending } = payoutData;
  const formattedDate = format(new Date(expectedPayoutDate), "MMMM d, yyyy 'at' h:mm a");

  return (
    <Alert className="mb-4 bg-blue-50 border-blue-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-start space-x-3">
          <RocketIcon className="h-5 w-5 text-blue-500 mt-0.5" />
          <div>
            <AlertTitle className="text-blue-800">
              Next Payout: {formattedDate} ({payoutFrequency})
            </AlertTitle>
            <AlertDescription className="text-blue-700">
              You have earned: ${totalPaid.toFixed(2)} (paid) + ${totalPending.toFixed(2)} (pending)
            </AlertDescription>
          </div>
        </div>
        <Link href={'/dashboard/therapist/settings'}>
        <Button variant="outline" className="bg-white hover:bg-blue-100 border-blue-300">
          View Payout History
        </Button>
        </Link>
      </div>
    </Alert>
  );
}