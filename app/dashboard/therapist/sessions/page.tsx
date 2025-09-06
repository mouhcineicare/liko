"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Skeleton, Alert, Space, Modal } from "antd";
import { HistoryOutlined, FileAddOutlined, InfoOutlined } from "@ant-design/icons";
import { toast } from "sonner";
import AppointmentsTable from "@/components/dashboard/therapist/AppointmentsTable";
import CreateAppointmentPlanLink from "@/components/dashboard/therapist/CreateAppointmentPlanLink";
// import PatientSelectionDialog from "@/components/dashboard/therapist/PatientSelectionDialog";

interface SessionObject {
  date: string;
  status: "completed" | "in_progress";
  payment: "unpaid" | "paid";
}

interface Appointment {
  _id: string;
  date: string;
  status: string;
  paymentStatus: "pending" | "completed" | "refunded" | "failed";
  plan: string;
  price: number;
  totalSessions: number;
  completedSessions: number;
  patientApproved: number | null;
  isDateUpdated?: boolean;
  isConfirmed: boolean;
  hasPreferedDate: boolean;
  patient: {
    _id: string;
    fullName: string;
    email: string;
    telephone: string;
    image?: string;
    timeZone?: string;
  };
  therapist?: {
    _id: string;
    fullName: string;
    image: string;
  };
  meetingLink?: string;
  declineComment?: string;
  recurring: SessionObject[];
  createdAt: string;
  patientTimezone: string;
  planType: string;
  stripePaymentStatus: string;
  stripeSubscriptionStatus?: string;
  isStripeActive: boolean;
  stripeVerified?: boolean;
  isBalance: boolean | null;
  checkoutSessionId: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function SessionsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    plan: "",
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
  });
  // const [patients, setPatients] = useState<Appointment["patient"][]>([]);
  // const [isPatientsLoading, setIsPatientsLoading] = useState(false);
  const [openAppointment,setOpenAppointment] = useState(false);
  const [isInfo, setIsInfo] = useState(false);

  useEffect(() => {
    fetchAppointments();
    // fetchPatients();
  }, [pagination.page, pagination.limit, searchTerm, filters]);

// In your SessionsPage component
const fetchAppointments = async () => {
  try {
    setIsLoading(true);
    setError(null);
    
    const params = new URLSearchParams();
    params.append("page", pagination.page.toString());
    params.append("limit", pagination.limit.toString());
    if (searchTerm) params.append("search", searchTerm);
    if (filters.plan) params.append("plan", filters.plan);
    if (filters.dateFrom) params.append("dateFrom", filters.dateFrom.toISOString());
    if (filters.dateTo) params.append("dateTo", filters.dateTo.toISOString());

    // Add parameter to ensure we're not getting paid appointments
    params.append("excludePaid", "true");

    const response = await fetch(`/api/therapist/sessions?${params.toString()}`);
    if (!response.ok) {
      throw new Error("Failed to fetch appointments");
    }

    const data = await response.json();
    
    setAppointments(data.appointments);
    setPagination(prev => ({
      ...prev,
      total: data.pagination.total,
      totalPages: Math.ceil(data.pagination.total / pagination.limit),
      hasNextPage: data.pagination.hasNextPage,
      hasPrevPage: data.pagination.hasPrevPage,
    }));
  } catch (error) {
    console.error("Error fetching appointments:", error);
    setError(error instanceof Error ? error.message : "An unknown error occurred");
    toast.error("Failed to load appointments");
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

  // const fetchPatients = async () => {
  //   setIsPatientsLoading(true);
  //    try {
  //     const response = await fetch(`/api/therapist/patients`);
  //     if (!response.ok) {
  //       throw new Error("Failed to fetch patients");
  //     }
  //     const data = await response.json();
  //      setPatients(data);
  //   } catch (error) {
  //     console.error("Error fetching patients:", error);
  //     setError(error instanceof Error ? error.message : "An unknown error occurred");
  //     toast.error("Failed to load patients");
  //   } finally {
  //     setIsPatientsLoading(false);
  //   }
  // };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (newFilters: {
    plan: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const renderTableSkeleton = () => (
    <Card>
      <Skeleton active paragraph={{ rows: 5 }} />
    </Card>
  );

  // const handlePatientSelect = (patient: Appointment["patient"]) => {
  //   setSelectedPatient(patient);
  //   setAddNewAppointment(false);
  //   setOpenAppointment(true);
  // }

  return (
    <div className="p-0">
      <Space direction="vertical" size="middle" className="w-full">
        <div className="flex justify-between items-center flex-wrap">
          <h1 className="text-sm font-bold sm:text-2xl">My Sessions</h1>
          <div className="flex flex-row items-center justify-end gap-2 flex-wrap ">
          <Button
            type="text"
            icon={<HistoryOutlined />}
            onClick={() => router.push('history')}
            className="flex items-center"
          >
            Session History
          </Button>
          <Button
            type="primary"
            icon={<FileAddOutlined />}
            onClick={() => setOpenAppointment(true)}
            className="flex items-center"
          >
            Create new Appointment link
          </Button>
          <Button 
           type="text"
           shape="circle"
           icon={<InfoOutlined />}
           onClick={() => setIsInfo(true)}
           className="text-black-800 hover:text-gray-500 bg-gray-200"
          />
          </div>
        </div>

        {error ? (
          <Alert message="Error" description={error} type="error" showIcon />
        ) : (
          <AppointmentsTable
              appointmentsData={appointments}
              pagination={pagination}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              onSearch={handleSearch}
              onFilterChange={handleFilterChange}
              refreshData={fetchAppointments}
              renderTabkeSkeleton={renderTableSkeleton}
              isLoading={isLoading}
              searchTerm={searchTerm}
            />
        )}
      </Space>
      {openAppointment && (
        <CreateAppointmentPlanLink
          open={openAppointment}
          onOpenChange={() => setOpenAppointment(false)}
        />
      )}

      <Modal
  title="Information"
  open={isInfo}
  onCancel={() => setIsInfo(false)}
  footer={[
    <Button key="close" onClick={() => setIsInfo(false)}>
      Close
    </Button>
  ]}
>
  <ul>
    <li>
      <h2 className="font-bold text-blue-400">1 . How to complete a session? :</h2>
      <ol className="mb-1">
        <li>- Click on the complete button.</li>
        <li>- In the popup, click on the complete button followed by the session.</li>
      </ol>

      <h2 className="font-bold text-blue-400">1 . What is payment status? :</h2>
      <ol>
        <li>- Payment status means if the patient has paid or not yet.</li>
        <li>- If payment verification failed ,please contact patient with the link to pay or contact icare team to solve the issue.</li>
        <li>- The payment link can be found in the Sessions table (it will appear as a brown button). You can copy this link and share it with your patient.</li>
      </ol>
    </li>
  </ul>
</Modal>
    </div>
  );
}