"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const COLORS = ["#FFBB28", "#00C49F", "#FF8042", "#0088FE", "#FF0000", "#00FF00", "#0000FF"];

export default function Page() {
  const [appointmentData, setAppointmentData] = useState<Array<{ name: string; value: number }>>([]);
  const [appointmentStatusData, setAppointmentStatusData] = useState<Array<{ name: string; value: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch("/api/therapist/appointments");
      if (!response.ok) {
        throw new Error("Failed to fetch appointments");
      }
      const appointments = await response.json();

      // Process appointment data for the bar chart
      const appointmentStatusCounts = {
        pending: appointments.filter((apt: any) => apt.status === "pending").length,
        matched_pending_therapist_acceptance: appointments.filter((apt: any) => apt.status === "matched_pending_therapist_acceptance").length,
        confirmed: appointments.filter((apt: any) => 
          apt.status === "confirmed"
        ).length,
        rejected: appointments.filter((apt: any) => apt.status === "rejected").length,
        cancelled: appointments.filter((apt: any) => apt.status === "cancelled").length,
        completed: appointments.filter((apt: any) => apt.status === "completed").length,
        in_progress: appointments.filter((apt: any) => apt.status === "in_progress").length,
      };

      const barChartData = [
        { name: "Pending", value: appointmentStatusCounts.pending },
        { name: "Pending Approval", value: appointmentStatusCounts.pending_approval },
        { name: "Confirmed", value: appointmentStatusCounts.confirmed },
        { name: "Rejected", value: appointmentStatusCounts.rejected },
        { name: "Cancelled", value: appointmentStatusCounts.cancelled },
        { name: "Completed", value: appointmentStatusCounts.completed },
        { name: "In Progress", value: appointmentStatusCounts.in_progress },
      ];

      // Process appointment data for the pie chart
      const pieChartData = Object.entries(appointmentStatusCounts).map(([name, value]) => ({
        name,
        value,
      }));

      setAppointmentData(barChartData);
      setAppointmentStatusData(pieChartData);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      toast.error("Failed to load appointment data");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Charts</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-[300px] w-full rounded-lg" />
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">Charts</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bar Chart for Appointment Statistics */}
        <Card className="p-6 bg-white border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Appointment Statistics</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={appointmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie Chart for Appointment Status Distribution */}
        <Card className="p-6 bg-white border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Appointment Status Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={appointmentStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {appointmentStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}