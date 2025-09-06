import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import TherapistPayment from "@/lib/db/models/TherapistPayment";
import { authOptions } from "@/lib/auth/config";
import { getServerSession } from "next-auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    // Get all completed appointments that are unpaid to therapists
    const unpaidAppointments = await Appointment.aggregate([
      {
        $match: {
          status: "completed",
          therapistPaid: false,
          therapist: { $exists: true }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "therapist",
          foreignField: "_id",
          as: "therapist"
        }
      },
      {
        $unwind: "$therapist"
      }
    ]);

    // Group by therapist and calculate amounts
    const therapistMap = new Map();
    let totalPending = 0;
    let totalAppointments = {
      amount: 0,
      count: 0
    };

    unpaidAppointments.forEach(apt => {
      const therapistId = apt.therapist._id.toString();
      const sessionPrice = apt.price / apt.totalSessions;
      const therapistAmount = sessionPrice * (apt.therapist.level === 2 ? 0.57 : 0.5) * apt.completedSessions;

      if (!therapistMap.has(therapistId)) {
        therapistMap.set(therapistId, {
          therapistId,
          therapistName: apt.therapist.fullName,
          pendingAmount: 0,
          paidAmount: 0,
          appointmentCount: 0
        });
      }

      const therapistData = therapistMap.get(therapistId);
      therapistData.pendingAmount += therapistAmount;
      therapistData.appointmentCount += 1;
      
      totalPending += therapistAmount;
      totalAppointments.amount += apt.price;
      totalAppointments.count += 1;
    });

    // Get paid amounts from payment history
    const payments = await TherapistPayment.aggregate([
      {
        $match: { status: "completed" }
      },
      {
        $group: {
          _id: "$therapist",
          paidAmount: { $sum: "$amount" }
        }
      }
    ]);

    // Combine the data
    const summaries = Array.from(therapistMap.values()).map(therapist => {
      const payment = payments.find(p => p._id.equals(therapist.therapistId));
      return {
        ...therapist,
        paidAmount: payment?.paidAmount || 0
      };
    });

    return NextResponse.json({
      summaries,
      totalPending,
      totalAppointments
    });
  } catch (error) {
    console.error("Error fetching payment summaries:", error);
    return NextResponse.json(
      { error: "Error fetching payment summaries" },
      { status: 500 }
    );
  }
}