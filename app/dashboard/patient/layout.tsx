"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import EmailVerificationAlert from "@/components/shared/EmailVerificationAlert";
import { useState, useEffect } from "react";
import { Menu, X, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import BookAppointment from "@/app/book-appointment/page";
import * as Dialog from '@radix-ui/react-dialog';
import { useTimeZone } from "@/hooks/useTimeZone";
import { NotificationAlert } from "@/components/shared/NotificationsAlert";

// Safe data validation functions
const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

const safeString = (value: any, defaultValue: string = ''): string => {
  return typeof value === 'string' ? value : defaultValue;
};

const safeBoolean = (value: any, defaultValue: boolean = false): boolean => {
  if (typeof value === 'boolean') return value;
  return Boolean(value);
};

export default function PatientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/auth/signin");
    },
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sessions, setSessions] = useState<number>(0);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const pathname = usePathname();
  const [therapyId, setTherapyId]= useState<string | null>(null);

  useTimeZone();
  
  async function getTherapyId(){
    try {
      const therapyIdResponse: any = await fetch(`/api/patient/therapy`);
      if (!therapyIdResponse.ok) {
        console.error('Failed to fetch therapy ID');
        return;
      }
      
      const therapyIdResult = await therapyIdResponse.json();
      if(therapyIdResult.success && therapyIdResult.therapyId){
        setTherapyId(safeString(therapyIdResult.therapyId));
      }
    } catch (error) {
      console.error('Error fetching therapy ID:', error);
    }
  }

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/patient/sessions');
        if (!response.ok) throw new Error('Failed to fetch sessions');
        const data = await response.json();
        
        // Safely handle the session data
        const totalSessions = safeNumber(data?.balance?.totalSessions, 0);
        setSessions(totalSessions);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        setSessions(0); // Set default value on error
      } finally {
        setLoadingSessions(false);
      }
    };

    if (session?.user?.role === 'patient') {
      fetchSessions();
      getTherapyId();
    }
  }, [session]);

  if (status === "loading") {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>;
  }

  if (session?.user?.role !== "patient") {
    redirect("/dashboard");
  }

  const navigation = [
    { name: "Appointments", href: "/dashboard/patient" },
    { name: "History", href: "/dashboard/patient/history" },
    { name: "Payments", href: "/dashboard/patient/payments" },
    { name: "Onboarding", href: "/dashboard/patient/onboarding" },
    { name: "Profile", href: "/dashboard/patient/profile" },
  ];

  // Safely get user data
  const userEmail = safeString(session?.user?.email, '');
  const userStatus = safeString(session?.user?.status, '');
  const sessionsDisplay = safeNumber(sessions, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation */}
      <div className="bg-white shadow md:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-700"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
            {!loadingSessions && (
              <div className="flex items-center gap-2">
                <Link href="/dashboard/patient/sessions-history">
                  <Button variant="outline" className="gap-2">
                    <Clock className="h-4 w-4" />
                    Payments
                  </Button>
                </Link>
                <Dialog.Root>
                  <Dialog.Trigger asChild>
                    <Button disabled={sessionsDisplay === 0} className="gap-2">
                      <Calendar className="h-4 w-4" />
                      {sessionsDisplay} AED
                    </Button>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50 z-50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto z-50">
                      <Dialog.Title className="text-xl font-bold mb-4">
                        Book New Appointment
                      </Dialog.Title>
                      <BookAppointment isPayWithBalance={true} therapyId={therapyId} onSuccess={() => {}} />
                      <Dialog.Close asChild>
                        <button
                          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                          aria-label="Close"
                        >
                          <X className="h-6 w-6" />
                        </button>
                      </Dialog.Close>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden md:block bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium",
                    pathname === item.href
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>
            {!loadingSessions && (
              <div className="flex items-center gap-4">
                <Link href="/dashboard/patient/sessions-history">
                  <Button variant="outline" className="gap-2">
                    <Clock className="h-4 w-4" />
                    Payments History
                  </Button>
                </Link>
                <Dialog.Root>
                  <Dialog.Trigger asChild>
                    <Button disabled={sessionsDisplay === 0} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                      <Calendar className="h-4 w-4" />
                      Balance ({sessionsDisplay} AED)
                    </Button>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50 z-50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto z-50">
                      <Dialog.Title className="text-xl font-bold mb-4">
                        Book New Appointment
                      </Dialog.Title>
                      <BookAppointment isPayWithBalance={true} therapyId={therapyId} onSuccess={() => {}} />
                      <Dialog.Close asChild>
                        <button
                          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                          aria-label="Close"
                        >
                          <X className="h-6 w-6" />
                        </button>
                      </Dialog.Close>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "block px-3 py-2 rounded-md text-base font-medium",
                  pathname === item.href
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <NotificationAlert />
        {userStatus === "pending" && userEmail && (
          <EmailVerificationAlert userEmail={userEmail} />
        )}
        {children}
      </div>
    </div>
  );
}