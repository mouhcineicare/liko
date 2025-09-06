"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, CreditCard, User, CheckCircle, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import PaginationControls from "@/components/ui/pagination-controls";

interface Appointment {
  _id: string;
  date: string;
  status: string;
  plan: string;
  price: number;
  totalSessions: number;
  completedSessions: number;
  patient: {
    _id: string;
    fullName: string;
    email: string;
    telephone: string;
    image?: string;
  };
  recurring: any[];
  payments: {
    _id: string;
    amount: number;
    status: string;
    paymentMethod: string;
    paidAt: string;
    transactionId?: string;
  }[];
  stripeData?: {
    paymentStatus: string;
    subscriptionStatus: string;
    verified: boolean;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function HistoryPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  useEffect(() => {
    fetchAppointments();
  }, [pagination.page, pagination.limit]);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(
        `/api/therapist/history?page=${pagination.page}&limit=${pagination.limit}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch appointment history");
      }
      
      const data = await response.json();
      setAppointments(data.appointments);
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
        hasNextPage: data.pagination.hasNextPage,
        hasPrevPage: data.pagination.hasPrevPage,
      }));
    } catch (error) {
      console.error("Error fetching appointment history:", error);
      toast.error("Failed to load appointment history");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), "PPPp");
  };

  const formatPaymentMethod = (method: string) => {
    switch (method.toLowerCase()) {
      case "stripe": return "Credit Card (Stripe)";
      case "manual": return "Manual Transfer";
      case "usdt":
      case "usdc": return `Crypto (${method.toUpperCase()})`;
      default: return method;
    }
  };

  const renderPaymentStatus = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" /> Paid
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const renderStripeStatus = (stripeData?: any) => {
    if (!stripeData) return null;
    
    return (
      <div className="mt-2">
        <h4 className="text-sm font-medium text-gray-500">Payment Verification:</h4>
        <div className="mt-1 flex items-center">
          {stripeData.verified ? (
            <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500 mr-1" />
          )}
          <span className="text-sm">
            {stripeData.verified ? "Verified" : "Not Verified"} - {stripeData.paymentStatus}
          </span>
        </div>
      </div>
    );
  };

  const renderAppointmentCard = (appointment: Appointment) => (
    <div key={appointment._id} className="border rounded-lg overflow-hidden shadow-sm">
      <div className="bg-white p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium">
              Session with {appointment.patient.fullName}
            </h3>
            <div className="mt-1 flex items-center text-sm text-gray-500">
              <Calendar className="h-4 w-4 mr-1" />
              {formatDate(appointment.date)}
            </div>
          </div>
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
            Completed
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2 text-gray-400" />
              <span className="text-sm">
                <span className="font-medium">Patient:</span> {appointment.patient.fullName}
              </span>
            </div>
            <div className="flex items-center">
              <CreditCard className="h-4 w-4 mr-2 text-gray-400" />
              <span className="text-sm">
                <span className="font-medium">Plan:</span> {appointment.plan}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-sm">
                <span className="font-medium">Price:</span> {appointment.price.toFixed(2)} AED
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-gray-400" />
              <span className="text-sm">
                <span className="font-medium">Sessions:</span> {appointment.completedSessions}/{appointment.totalSessions}
              </span>
            </div>
            {renderStripeStatus(appointment.stripeData)}
          </div>
        </div>

        {appointment.payments.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Payment Details</h4>
            <div className="border rounded-md divide-y">
              {appointment.payments.map((payment) => (
                <div key={payment._id} className="p-3">
                  <div className="flex justify-between">
                    <div>
                      <span className="text-sm font-medium">
                        {formatPaymentMethod(payment.paymentMethod)}
                      </span>
                      {payment.transactionId && (
                        <p className="text-xs text-gray-500 mt-1">
                          ID: {payment.transactionId}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">${payment.amount.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {payment.paidAt ? formatDate(payment.paidAt) : 'Pending'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    {renderPaymentStatus(payment.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border rounded-lg p-6">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
          <div className="mt-6">
            <Skeleton className="h-4 w-24 mb-3" />
            <div className="border rounded-md p-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="mt-2 flex justify-end">
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Session History</h1>
      </div>

      {isLoading ? (
        renderSkeleton()
      ) : (
        <div className="space-y-4">
          {appointments.length > 0 ? (
            <>
              {appointments.map(renderAppointmentCard)}
              <PaginationControls
                pagination={pagination}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
              />
            </>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 text-gray-400">
                <Calendar className="w-full h-full" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No completed sessions</h3>
              <p className="mt-1 text-sm text-gray-500">
                Your completed therapy sessions will appear here.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}