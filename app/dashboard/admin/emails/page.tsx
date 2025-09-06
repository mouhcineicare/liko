'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminEmailsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the enhanced email management page
    router.replace('/dashboard/admin/emails/enhanced');
  }, [router]);

  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Redirecting to enhanced email management...</p>
      </div>
    </div>
  );
}
