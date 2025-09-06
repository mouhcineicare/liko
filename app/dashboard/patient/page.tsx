import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import AppointmentsPage from "@/components/dashboard/patient/AppointmentsPage";
import { getPatientAppointments } from "@/lib/api/appointments";

export default async function PatientDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "patient") {
    redirect("/auth/signin");
  }

  const { appointments, counts } = await getPatientAppointments(session.user.id);

  return (
    <AppointmentsPage 
      appointments={appointments}
      initialCounts={counts}
    />
  );
}