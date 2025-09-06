// /api/admin/mark-sessions-paid.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import { TherapistPayment, Appointment } from "@/lib/db/models";


export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const payments = await TherapistPayment.find({ status: "completed" }).lean();

    const sessionIdsPaid = new Set(
      payments.flatMap(p => p.sessions)
    );

    const appointmentIds = Array.from(
      new Set(payments.flatMap(p => p.appointments.map(String)))
    );

    const appointments = await Appointment.find({ _id: { $in: appointmentIds } });

    for (const appointment of appointments) {
      const updatedRecurring = Array.isArray(appointment.recurring)
        ? appointment.recurring.map((s: any) => {
            if (typeof s === 'object' && sessionIdsPaid.has(s.date)) {
              return { ...s, payment: 'paid' };
            }
            return s;
          })
        : appointment.recurring;

      await Appointment.findByIdAndUpdate(appointment._id, {
        recurring: updatedRecurring
      });
    }

    return NextResponse.json({ success: true, updated: appointments.length });
  } catch (error: any) {
    console.error("Error marking sessions as paid:", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
