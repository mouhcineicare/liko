import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/config";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }


  // Redirect to role-specific dashboard
  switch (session.user.role) {
    case "patient":
      redirect("/dashboard/patient");
    case "therapist":
      redirect("/dashboard/therapist");
    case "admin":
      redirect("/dashboard/admin");
    default:
      redirect("/auth/signin");
  }
}