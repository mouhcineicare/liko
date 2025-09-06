"use client"

import { useState, useEffect } from "react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { 
  MoreVertical, 
  Eye, 
  UserPlus, 
  CheckCircle2, 
  Ban, 
  Edit, 
  Trash2,
  Search,
  RefreshCw
} from "lucide-react"
import { Spin } from "antd"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import EditPatientDialog from "@/components/dashboard/admin/EditPatientDialog"
import ChangeTherapistDialog from "@/components/dashboard/admin/ChangeTherapistDialog"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PaymentDetails {
  amount: number;
  currency: string;
  payment_method: string;
  created: string;
  payment_intent_status?: string;
}

interface AppointmentInfo {
  id: string;
  checkoutSessionId?: string;
  status: string;
  createdAt: string;
}

interface Patient {
  _id: string;
  fullName: string;
  email: string;
  telephone: string;
  createdAt: string;
  status: "active" | "banned" | "pending" | "in_review";
  therapy?: string;
  initialPlan?: { plan: string; therapyType: string };
  paymentStatus: string;
  paymentDetails?: {
    amount: number;
    currency: string;
    payment_method: string;
    created: string;
    payment_intent_status?: string;
  };
  appointment?: AppointmentInfo | null;
  totalAppointments: number;
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalPatients: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

type Props = {
  setIsMatched: (v: boolean) => void;
}

export default function MatchingPatients({setIsMatched}: Props) {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalPatients: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(1, itemsPerPage, searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, itemsPerPage]);

  const fetchPatients = async (page: number, limit: number, query = "") => {
    try {
      setIsLoading(true);
      setError(null);

      const url = `/api/admin/patients/not-matched?page=${page}&limit=${limit}${
        query ? `&search=${encodeURIComponent(query)}` : ""
      }`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch patients");
      }

      const data = await response.json();
      setPatients(data.patients);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching patients:", error);
      setError("Failed to load patients");
      toast.error("Failed to load patients");
      setPatients([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanUser = async (userId: string) => {
    setLoadingAction(`ban-${userId}`);
    try {
      const response = await fetch(`/api/admin/users/${userId}/ban`, {
        method: "PUT",
      });

      if (!response.ok) {
        throw new Error("Failed to update user status");
      }

      toast.success("User banned successfully");
      fetchPatients(pagination.currentPage, itemsPerPage, searchTerm);
      setIsMatched(true);
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error("Failed to ban user");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleActivateUser = async (userId: string) => {
    setLoadingAction(`activate-${userId}`);
    try {
      const response = await fetch(`/api/admin/users/${userId}/activate`, {
        method: "PUT",
      });

      if (!response.ok) {
        throw new Error("Failed to activate user");
      }

      toast.success("User activated successfully");
      fetchPatients(pagination.currentPage, itemsPerPage, searchTerm);
    } catch (error) {
      console.error("Error activating user:", error);
      toast.error("Failed to activate user");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setLoadingAction(`delete-${userId}`);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      toast.success("User deleted successfully");
      fetchPatients(pagination.currentPage, itemsPerPage, searchTerm);
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    } finally {
      setLoadingAction(null);
      setShowDeleteDialog(false);
    }
  };

  const handleViewDetails = (patientId: string) => {
    router.push(`/dashboard/admin/patients/${patientId}`);
  };

  const handleEdit = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowEditDialog(true);
  };

  const handleMatchTherapist = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowMatchDialog(true);
  };

  const handleEditSuccess = () => {
    fetchPatients(pagination.currentPage, itemsPerPage, searchTerm);
  };

  const handleMatchSuccess = () => {
    fetchPatients(pagination.currentPage, itemsPerPage, searchTerm);
    setShowMatchDialog(false);
  };

  const handlePageChange = (newPage: number) => {
    fetchPatients(newPage, itemsPerPage, searchTerm);
  };

  const refreshPaymentStatus = async (patientId: string) => {
    try {
      const response = await fetch(`/api/admin/patients/${patientId}/refresh-payment`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Refresh failed');
      
      const data = await response.json();
      fetchPatients(pagination.currentPage, itemsPerPage, searchTerm);
      toast.success('Payment status refreshed');
    } catch (error) {
      console.error('Error refreshing payment status:', error);
      toast.error('Failed to refresh payment status');
    }
  };

  const getPaymentBadge = (patient: Patient) => {
  if (patient.totalAppointments === 0) {
    return <Badge className="bg-gray-100 text-gray-800 border-gray-200">No Appointments</Badge>;
  }

  if (!patient.appointment?.checkoutSessionId) {
    return (
      <div className="flex flex-col gap-1">
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">No Payment</Badge>
        <span className="text-xs text-gray-500">{patient.totalAppointments} appointment(s)</span>
      </div>
    );
  }

  // Handle error state
  if (patient.paymentStatus === 'error') {
    return (
      <div className="flex flex-col gap-1">
        <Badge className="bg-red-100 text-red-800 border-red-200">Payment Error</Badge>
        <span className="text-xs text-red-500">Check session ID</span>
      </div>
    );
  }

  // Handle successful payment states
  switch (patient.paymentStatus.toLowerCase()) {
    case 'paid':
      return (
        <div className="flex flex-col gap-1">
          <Badge className="bg-green-100 text-green-800 border-green-200">Paid</Badge>
          {patient.paymentDetails && (
            <span className="text-xs text-gray-500">
              {patient.paymentDetails.amount} {patient.paymentDetails.currency.toUpperCase()}
            </span>
          )}
        </div>
      );
    case 'unpaid':
      return (
        <div className="flex flex-col gap-1">
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Unpaid</Badge>
          {patient.paymentDetails && (
            <span className="text-xs text-gray-500">
              Created: {format(new Date(patient.appointment.createdAt), "MMM d, h:mm a")}
            </span>
          )}
        </div>
      );
    default:
      return (
        <div className="flex flex-col gap-1">
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">Unknown</Badge>
          <span className="text-xs text-gray-500">{patient.totalAppointments} appointment(s)</span>
        </div>
      );
  }
};

  if (isLoading && patients.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="default" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-600">
        {error}
        <Button onClick={() => fetchPatients(1, itemsPerPage, searchTerm)} className="ml-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Match New Patients</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search patients..."
              className="pl-9 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => setItemsPerPage(Number(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Items per page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 per page</SelectItem>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="20">20 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="text-gray-700">Joined</TableHead>
              <TableHead className="text-gray-700">Patient</TableHead>
              <TableHead className="text-gray-700">Contact</TableHead>
              <TableHead className="text-gray-700">Plan</TableHead>
              <TableHead className="text-gray-700">Payment</TableHead>
              <TableHead className="text-gray-700 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isMobile ? 3 : isTablet ? 5 : 6} className="text-center text-gray-500 py-4">
                  {searchTerm ? "No patients found matching your search" : "No unmatched patients available"}
                </TableCell>
              </TableRow>
            ) : (
              patients.map((patient) => (
                <TableRow
                  key={patient._id}
                  className="hover:bg-gray-50"
                >
                  <TableCell className="whitespace-nowrap">
                    <div>{format(new Date(patient.createdAt), "MMM d")}</div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(patient.createdAt), "h:mm a")}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="font-medium">{patient.fullName}</div>
                    {isMobile && (
                      <div className="text-xs text-gray-500">{patient.email}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">{patient.email}</div>
                    <div className="text-xs text-gray-500">{patient.telephone}</div>
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm">
                    {patient?.initialPlan?.plan || "Not specified"} <br/>
                    <span className="text-sm text-gray-500">{patient?.initialPlan?.therapyType || ""}</span>
                  </TableCell>
                  <TableCell>
                    {getPaymentBadge(patient)}
                    {patient.paymentDetails?.payment_intent_status && (
                      <div className="text-xs text-gray-500 mt-1">
                        {patient.paymentDetails.payment_intent_status}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleMatchTherapist(patient)}
                        disabled={!!loadingAction}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        {!isMobile && "Match"}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => refreshPaymentStatus(patient._id)}
                            disabled={!patient.appointment?.checkoutSessionId}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh Payment
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewDetails(patient._id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(patient)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {patient.status !== "active" && (
                            <DropdownMenuItem 
                              onClick={() => handleActivateUser(patient._id)}
                              disabled={!!loadingAction}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Activate
                              {loadingAction === `activate-${patient._id}` && (
                                <span className="ml-2">...</span>
                              )}
                            </DropdownMenuItem>
                          )}
                          {patient.status !== "banned" && (
                            <DropdownMenuItem 
                              onClick={() => handleBanUser(patient._id)}
                              disabled={!!loadingAction}
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Ban
                              {loadingAction === `ban-${patient._id}` && (
                                <span className="ml-2">...</span>
                              )}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => {
                              setSelectedPatient(patient);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPatients > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-700">
            Showing {(pagination.currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(pagination.currentPage * itemsPerPage, pagination.totalPatients)} of {pagination.totalPatients} patients
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Patient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this patient? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedPatient && handleDeleteUser(selectedPatient._id)}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!!loadingAction}
            >
              {loadingAction === `delete-${selectedPatient?._id}` ? (
                <span className="flex items-center">
                  Deleting...
                </span>
              ) : (
                "Delete Patient"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedPatient && (
        <>
          <EditPatientDialog
            patient={selectedPatient}
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            onSuccess={handleEditSuccess}
          />
          <ChangeTherapistDialog
            patient={selectedPatient}
            open={showMatchDialog}
            onOpenChange={setShowMatchDialog}
            onSuccess={handleMatchSuccess}
          />
        </>
      )}
    </div>
  );
}