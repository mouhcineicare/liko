import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import User from "@/lib/db/models/User";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "therapist") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    // First find matching patients if search query exists
    let patientFilter = {};
    if (search) {
      const patients = await User.find({
        role: 'patient',
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id').lean();

      patientFilter = { patient: { $in: patients.map(p => p._id) } };
    }

    const query = {
      therapist: session.user.id,
      isPayoutRejected: true,
      ...patientFilter
    };

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate('patient', 'fullName email telephone image')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Appointment.countDocuments(query)
    ]);

    return NextResponse.json({
      data: appointments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Error fetching rejected payouts:", error);
    return NextResponse.json(
      { error: "Failed to fetch rejected payouts" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "therapist") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { appointmentId, justifyNote } = await req.json();

    const updated = await Appointment.findOneAndUpdate(
      {
        _id: appointmentId,
        therapist: session.user.id,
        isPayoutRejected: true
      },
      {
        $set: {
          justifyPayout: true,
          justifyNote,
          justifyDate: new Date()
        }
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Appointment not found or not rejected" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, appointment: updated });

  } catch (error) {
    console.error("Error justifying payout:", error);
    return NextResponse.json(
      { error: "Failed to justify payout" },
      { status: 500 }
    );
  }
}