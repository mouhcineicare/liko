import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import TherapyChangeRequest from "@/lib/db/models/TherapyChangeRequest";
import User from "@/lib/db/models/User";
import { triggerNotification, NotificationType } from "@/lib/services/notifications";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reason } = await req.json();

    if (!reason) {
      return NextResponse.json(
        { error: "Reason is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // // Get the latest active appointment for this patient
    // const latestAppointment = await Appointment.findOne({
    //   patient: session.user.id,
    //   status: { 
    //     $in: ["pending", "approved", "in_progress","cancelled","completed","pending_approval","rescheduled"] 
    //   }
    // }).sort({ date: -1 });

    // if (!latestAppointment) {
    //   return NextResponse.json(
    //     { error: "No active appointments found with a therapist" },
    //     { status: 400 }
    //   );
    // }

    // Check if there's already a pending request
    const existingRequest = await TherapyChangeRequest.findOne({
      patient: session.user.id,
      status: "pending"
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "You already have a pending therapy change request" },
        { status: 400 }
      );
    }

    // limit per hour not rquired for now but will be activated later

  //   const countRequestsPerHour = await TherapyChangeRequest.find({
  //     patient: session.user.id,
  //   });

  //   const currentTime = new Date(countRequestsPerHour[countRequestsPerHour.length-1].createdAt).getTime();
 
  //   const oneHourAgo = Date.now() - 60 * 60 * 1000;

  //  if (countRequestsPerHour.length >= 3 && currentTime > oneHourAgo) {
  //     return NextResponse.json(
  //       { error: "You have reached the maximum number of requests per hour" },
  //       { status: 400 }
  //     );
  // }

    const patient = await User.findById(session.user.id);

    if(patient && !patient.therapy){
      return NextResponse.json(
        { error: "You Dont have any therapy to request change!" },
        { status: 401 }
      );
    }

   if(patient){
     // Create therapy change request
     const request = new TherapyChangeRequest({
      patient: session.user.id,
      currentTherapist: patient.therapy,
      reason,
    });

    await request.save();
   } else{
    return NextResponse.json(
      { error: "An internal error please contact support!" },
      { status: 401 }
    );
   }

   const therapist = await User.findById(patient.therapy);
   const admin = await User.findOne({ role: "admin" });

   await triggerNotification(NotificationType.THERAPY_REQUEST_CHANGE_CREATED, [session.user.id, admin._id.toString()], {
    patientName: session.user.name,
    therapistName: therapist.fullName,
  });

    return NextResponse.json({
      success: true,
      message: "Therapy change request submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting therapy change request:", error);
    return NextResponse.json(
      { error: "Error submitting request" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const requests = await TherapyChangeRequest.find({ patient: session.user.id })
      .populate("currentTherapist", "fullName")
      .populate("newTherapist", "fullName")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error("Error fetching therapy change requests:", error);
    return NextResponse.json(
      { error: "Error fetching requests" },
      { status: 500 }
    );
  }
}