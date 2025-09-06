import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    const baseQuery = {
      therapist: null,
      paymentStatus: "completed",
      status: { $in: ["pending", "pending_approval"] }
    };
    
    const [appointments, totalCount] = await Promise.all([
      Appointment.find(baseQuery)
        .populate("patient", "fullName")
        .sort({ createdAt: -1 }) // sort by newest first
        .skip(skip)
        .limit(limit),
        
      Appointment.countDocuments(baseQuery)
    ]);

    return NextResponse.json({
      data: appointments,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1,
      }
    });
  } catch (error) {
    console.error("Error fetching unassigned appointments:", error);
    return NextResponse.json(
      { error: "Error fetching appointments" },
      { status: 500 }
    );
  }
}