"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, Skeleton, Alert } from "antd";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useTimeZone } from "@/hooks/useTimeZone";
import TherapistAppointmentStatusView from "@/components/dashboard/therapist/TherapistAppointmentStatusView";
// import TherapistCalendar from "./calendar/page";
// import PatientCapacity from "@/components/therapist/PatientCapacity";
import Main from './main/page';

const { Meta } = Card;

export default function TherapistDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalPatients: 0,
    pendingAppointments: 0,
    todaySessions: 0,
    totalRevenue: 0,
  });
  const [sessionStats, setSessionStats] = useState({
    weeklyPatientsLimit: 10,
    remainingWeeklySessions: 0,
    totalCompletedSessions: 0,
  });
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments'>('overview');
  const { data: session } = useSession();
  
  useTimeZone();

  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([fetchSessionStats(), fetchPatients()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
        toast.error("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // const fetchDashboardStats = async () => {
  //   const response = await fetch("/api/therapist/appointments");
  //   if (!response.ok) throw new Error("Failed to fetch stats");
    
  //   const appointments = await response.json();
  //   const uniquePatients = new Set(appointments.map((apt: { patient: { _id: any; }; }) => apt.patient._id)).size;
  //   const todayCount = appointments.filter((apt: any) => {
  //     const aptDate = new Date(apt.date);
  //     const today = new Date();
  //     return aptDate.toDateString() === today.toDateString() && apt.status === "approved";
  //   }).length;
  //   const totalRevenue = appointments
  //     .filter((apt: { paymentStatus: string; }) => apt.paymentStatus === "completed")
  //     .reduce((sum: any, apt: { price: any; }) => sum + apt.price, 0);

  //   setStats({
  //     totalPatients: uniquePatients,
  //     pendingAppointments: appointments.filter((apt: { status: string; }) => apt.status === "pending").length,
  //     todaySessions: todayCount,
  //     totalRevenue,
  //   });
  // };

  const fetchSessionStats = async () => {
    const response = await fetch("/api/therapist/settings");
    if (!response.ok) throw new Error("Failed to fetch session stats");
    setSessionStats(await response.json());
  };

  const fetchPatients = async () => {
    const response = await fetch("/api/therapist/patients");
    if (!response.ok) throw new Error("Failed to fetch patients");
    setPatients(await response.json());
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <Skeleton active paragraph={{ rows: 4 }} />
        <Skeleton active paragraph={{ rows: 6 }} className="mt-6" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert message="Error" description={error} type="error" showIcon />
      </div>
    );
  }

  return (
    <div className="p-2">
      {/* Navigation Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard Overview
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'appointments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Patient Appointments
            </button>
          </nav>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'overview' ? (
        <>
          {/* Patient Capacity Card */}
          {/* <PatientCapacity
            currentPatients={patients.length}
            maxPatients={sessionStats.weeklyPatientsLimit > 0 ? sessionStats.weeklyPatientsLimit : 10}
            remainingSessions={sessionStats.remainingWeeklySessions}
            totalCompletedSessions={sessionStats.totalCompletedSessions}
          /> */}

          {/* Stats Overview */}

          {/* Appointments Section */}
          <Main/>
        </>
      ) : (
        <TherapistAppointmentStatusView />
      )}
    </div>
  );
}