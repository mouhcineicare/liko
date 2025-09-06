import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import { Types } from "mongoose";

interface Patient {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
}

interface PopulatedAppointment {
  _id: string;
  patient: Patient;
  therapist: Types.ObjectId;
  date: Date;
  status: string;
  meetingLink?: string;
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { meetingLink } = await req.json();
    if (!meetingLink) {
      return NextResponse.json(
        { error: "Meeting link is required" },
        { status: 400 }
      );
    }

    await connectDB();
    const appointment = await Appointment.findById(
      params.id
    ).populate<PopulatedAppointment>("patient", "fullName email");

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Verify the therapist has access to this appointment
    if (
      !appointment.therapist ||
      appointment.therapist.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if appointment is in a valid state for adding meeting link
    if (!["approved", "in_progress","pending","cancelled","rescheduled"].includes(appointment.status)) {
      return NextResponse.json(
        { error: "Can only add meeting link to approved or in-progress appointments" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(meetingLink);
    } catch (e) {
      return NextResponse.json(
        { error: "Please provide a valid URL" },
        { status: 400 }
      );
    }

    // Update appointment with meeting link
    appointment.meetingLink = meetingLink;
    await appointment.save();

    return NextResponse.json({
      meetingLink,
      message: "Meeting link added successfully",
    });
  } catch (error) {
    console.error("Error adding meeting link:", error);
    return NextResponse.json(
      { error: "Error adding meeting link" },
      { status: 500 }
    );
  }
}