// app/not-found.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HeartPulse, ArrowLeft } from 'lucide-react';
import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Platform Logo */}
        <div className="flex justify-center">
          <HeartPulse className="h-12 w-12 text-blue-600" />
        </div>

        {/* 404 Illustration */}
        <div className="relative w-64 h-64 mx-auto">
          <Image
            src="/assets/img/hero1.png" // Replace with your custom illustration
            alt="Page not found"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Error Message */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">404</h1>
          <h2 className="text-2xl font-semibold text-gray-800">Page Not Found</h2>
          <p className="text-gray-600">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild className="gap-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Return Home
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/contact">
              Contact Support
            </Link>
          </Button>
        </div>

        {/* Platform-specific guidance */}
        <div className="pt-6 border-t border-gray-200 mt-6">
          <p className="text-sm text-gray-500">
            If you're a therapist, please check your dashboard. Patients can find appointments in their profile.
          </p>
        </div>
      </div>
    </div>
  );
}