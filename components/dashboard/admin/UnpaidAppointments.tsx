"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";
import { Spin } from "antd";

interface Appointment {
  _id: string;
  patient: {
    fullName: string;
    email: string;
  };
  plan: string;
  price: number;
  date: string;
  status: string;
  paymentStatus: string;
}

interface ApiResponse {
  data: Appointment[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export default function UnpaidAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  });

  useEffect(() => {
    fetchAppointments();
  }, [pagination.page]);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/admin/appointments/unpaid?page=${pagination.page}&limit=${pagination.limit}`
      );
      if (response.ok) {
        const data: ApiResponse = await response.json();
        setAppointments(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Failed to load appointments");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center w-full min-h-[200px]">
      <Spin size="default"/>
    </div>;
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="text-gray-700">Patient</TableHead>
              <TableHead className="text-gray-700">Email</TableHead>
              <TableHead className="text-gray-700">Plan</TableHead>
              <TableHead className="text-gray-700">Price</TableHead>
              <TableHead className="text-gray-700">Date & Time</TableHead>
              <TableHead className="text-gray-700">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-4">
                  No unpaid appointments found
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((appointment) => (
                <TableRow key={appointment._id} className="hover:bg-gray-50">
                  <TableCell className="text-gray-900">{appointment.patient?.fullName || 'Removed'}</TableCell>
                  <TableCell className="text-gray-900">{appointment.patient?.email || 'N/A'}</TableCell>
                  <TableCell className="text-gray-900">{appointment.plan}</TableCell>
                  <TableCell className="text-gray-900">د.إ{appointment.price}</TableCell>
                  <TableCell className="text-gray-900">
                    {format(new Date(appointment.date), "PPp")}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-red-100 text-red-800">
                      Not Paid
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-sm text-gray-700">
          Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={!pagination.hasPrevPage}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={!pagination.hasNextPage}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}