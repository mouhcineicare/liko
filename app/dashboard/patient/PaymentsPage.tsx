"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { CreditCard, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Appointment {
  _id: string;
  date: string;
  status: string;
  price: number;
  plan: string;
  isStripeVerified: boolean;
  isBalance: boolean;
  therapist: {
    fullName: string;
    image: string;
  } | null;
  createdAt: string;
}

export default function PaymentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paidAppointments, setPaidAppointments] = useState<Appointment[]>([]);
  const [unpaidAppointments, setUnpaidAppointments] = useState<Appointment[]>([]);
  const [showAllPaid, setShowAllPaid] = useState(false);
  const [paidAppointmentsToShow, setPaidAppointmentsToShow] = useState<Appointment[]>([]);

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    // Update paid appointments to show based on pagination
    if (showAllPaid) {
      setPaidAppointmentsToShow(paidAppointments);
    } else {
      setPaidAppointmentsToShow(paidAppointments.slice(0, 5));
    }
  }, [showAllPaid, paidAppointments]);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/patient/appointments?skip=0&limit=100');
      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }
      
      const data = await response.json();
      const fetchedAppointments = data.appointments || [];
      
      setAppointments(fetchedAppointments);
      
      // Separate paid and unpaid appointments based on Stripe verification
      const paid = fetchedAppointments.filter((apt: Appointment) => 
        apt.isStripeVerified || apt.isBalance
      );
      const unpaid = fetchedAppointments.filter((apt: Appointment) => 
        !apt.isStripeVerified && !apt.isBalance
      );
      
      setPaidAppointments(paid);
      setUnpaidAppointments(unpaid);
      
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAppointment = async (appointmentId: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to remove appointment");
      }

      // Remove from both lists and refresh
      setUnpaidAppointments(prev => prev.filter(apt => apt._id !== appointmentId));
      setPaidAppointments(prev => prev.filter(apt => apt._id !== appointmentId));
      toast.success("Appointment removed successfully");
    } catch (error: any) {
      console.error("Error removing appointment:", error);
      toast.error(error.message || "Failed to remove appointment");
    }
  };

  const handleLoadMore = () => {
    setShowAllPaid(true);
  };

  // Calculate totals
  const totalPaidAmount = paidAppointments.reduce((total, apt) => total + (apt.price || 0), 0);
  const totalUnpaidAmount = unpaidAppointments.reduce((total, apt) => total + (apt.price || 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Payments Overview</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading appointments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Payments Overview</h1>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6 bg-white shadow rounded-xl border border-blue-100">
          <h3 className="text-sm font-medium text-gray-900">Total Pending</h3>
          <p className="mt-2 text-3xl font-bold text-blue-700">
            د.إ{totalUnpaidAmount.toFixed(2)}
          </p>
        </Card>
        <Card className="p-6 bg-white shadow rounded-xl border border-green-100">
          <h3 className="text-sm font-medium text-gray-900">Total Paid</h3>
          <p className="mt-2 text-3xl font-bold text-green-700">
            د.إ{totalPaidAmount.toFixed(2)}
          </p>
        </Card>
        <Card className="p-6 bg-white shadow rounded-xl border border-yellow-100">
          <h3 className="text-sm font-medium text-gray-900">Pending Payments</h3>
          <p className="mt-2 text-3xl font-bold text-yellow-600">
            {unpaidAppointments.length}
          </p>
        </Card>
      </div>

      {/* Paid Appointments Section */}
      {paidAppointments.length > 0 && (
        <Card className="p-6 border-green-200 bg-green-50 rounded-xl shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold">Paid Appointments</h2>
              <p className="text-sm text-gray-600 mt-1">
                {paidAppointments.length} {paidAppointments.length === 1 ? 'appointment' : 'appointments'} paid
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Paid Amount</p>
              <p className="text-xl font-bold text-green-600">د.إ{totalPaidAmount.toFixed(2)}</p>
            </div>
          </div>
          <div className="space-y-4">
            {paidAppointmentsToShow.map((apt) => (
              <div
                key={apt._id}
                className="p-4 bg-white rounded-lg shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-green-50"
              >
                <div>
                  <h3 className="font-medium text-lg text-green-900">
                    {apt.plan || "Unknown Plan"}
                  </h3>
                  <p className="text-gray-600">
                    {apt.therapist?.fullName 
                      ? `with Dr. ${apt.therapist.fullName}`
                      : "Therapist to be assigned"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {apt.date ? format(new Date(apt.date), "PPP") : "Date not available"} at {apt.date ? format(new Date(apt.date), "p") : "Time not available"}
                  </p>
                  <p className="text-sm font-medium text-green-600 mt-1">
                    د.إ{(apt.price || 0).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    apt.status === "completed" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                  }`}>
                    {apt.status === "completed" ? "Completed" : "Active"}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {apt.isBalance ? "Balance" : "Stripe"}
                  </span>
                </div>
              </div>
            ))}
            
            {/* Load More Button */}
            {paidAppointments.length > 5 && !showAllPaid && (
              <div className="text-center pt-4">
                <Button
                  onClick={handleLoadMore}
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-50"
                >
                  Load More ({paidAppointments.length - 5} more)
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Unpaid Appointments Section */}
      {unpaidAppointments.length === 0 ? (
        <Card className="p-6 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="flex flex-col items-center justify-center text-center py-6">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Pending Payments</h2>
            <p className="text-gray-600 mb-4">
              You don&apos;t have any appointments waiting for payment.
            </p>
            <Button
              onClick={() => router.push("/book-appointment")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg px-6 py-2 shadow"
            >
              Book New Appointment
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6 border-orange-200 bg-orange-50 rounded-xl shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold">Pending Payments</h2>
              <p className="text-sm text-gray-600 mt-1">
                {unpaidAppointments.length} {unpaidAppointments.length === 1 ? 'appointment' : 'appointments'} pending payment
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Pending Amount</p>
              <p className="text-xl font-bold text-blue-600">د.إ{totalUnpaidAmount.toFixed(2)}</p>
            </div>
          </div>
          <div className="space-y-4">
            {unpaidAppointments.map((apt) => (
              <div
                key={apt._id}
                className="p-4 bg-white rounded-lg shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-blue-50"
              >
                <div>
                  <h3 className="font-medium text-lg text-blue-900">
                    {apt.plan || "Unknown Plan"}
                  </h3>
                  <p className="text-gray-600">
                    {apt.therapist?.fullName 
                      ? `with Dr. ${apt.therapist.fullName}`
                      : "Therapist to be assigned"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {apt.date ? format(new Date(apt.date), "PPP") : "Date not available"} at {apt.date ? format(new Date(apt.date), "p") : "Time not available"}
                  </p>
                  <p className="text-sm font-medium text-blue-600 mt-1">
                    د.إ{(apt.price || 0).toFixed(2)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-w-[140px]">
                  <Button
                    onClick={() => router.push(`/payment?appointmentId=${apt._id}`)}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg px-4 py-2 shadow flex items-center justify-center"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay Now
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-red-600 hover:bg-white text-white hover:text-red-600 hover:border-red-600 transition-colors font-semibold rounded-lg px-4 py-2 shadow flex items-center justify-center"
                    onClick={() => handleRemoveAppointment(apt._id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}