"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default function InReviewPage() {
  return (
    <div className="min-h-full flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full p-8 bg-white shadow-sm border border-gray-200">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Your Account is Under Review
          </h2>
          <p className="text-gray-600 mb-6">
            Thank you for registering as a therapist. Our team is currently 
            reviewing your application. You'll receive an email notification 
            once your account has been approved.
          </p>
          <div className="flex flex-col space-y-4">
            <Button asChild variant="outline">
              <Link href="/">Return to Homepage</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signin">Sign Out</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}