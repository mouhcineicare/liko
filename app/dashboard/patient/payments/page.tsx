import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import PaymentsPage from "../PaymentsPage";

export default async function PatientPaymentsPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "patient") {
    redirect("/auth/signin");
  }

  return <PaymentsPage />;
}