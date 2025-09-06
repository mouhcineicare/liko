export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import User from "@/lib/db/models/User";
import Appointment from "@/lib/db/models/Appointment";
import { Types } from "mongoose";

interface Patient {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  telephone: string;
  image?: string;
  therapy?: Types.ObjectId | string;
  timeZone?: string;
}

interface ProcessedPatient {
  _id: string;
  fullName: string;
  email: string;
  telephone: string;
  image?: string;
  totalSessions: number;
  lastAppointment?: string;
  nextAppointment?: string;
  timeZone?: string;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get all patients where therapy field matches current therapist's ID
    const patients = await User.find({
      role: 'patient',
      therapy:  new Types.ObjectId(session.user.id)
    })
    .select('fullName email telephone image therapy timeZone')
    .lean();

    // If no patients found, return empty array
    if (!patients || patients.length === 0) {
      return NextResponse.json([]);
    }

    // Get all appointments for these patients to calculate session counts
    const appointments = await Appointment.find({
      patient: { $in: patients.map(p => p._id) },
      therapist: session.user.id
    })
    .select('patient date status')
    .sort({ date: -1 })
    .lean();

    let timeZone = "Asia/Dubai";

    // Process patient data with appointment information
    const processedPatients: ProcessedPatient[] = patients.map(patient => {
      const patientAppointments = appointments.filter(apt => 
        apt.patient.toString() === patient._id.toString()
      );

      const completedSessions = patientAppointments.filter(
        apt => apt.status === 'completed'
      ).length;

      const now = new Date();
      const lastAppointment = patientAppointments.find(
        apt => new Date(apt.date) < now && apt.status === 'completed'
      );
      const nextAppointment = patientAppointments.find(
        apt => new Date(apt.date) > now && 
        ['pending_approval', 'approved', 'in_progress'].includes(apt.status)
      );

      if(lastAppointment && lastAppointment.patientTimezone) {
        timeZone = lastAppointment.patientTimezone;
      }else {
        if(patient.timeZone) {
          timeZone = patient.timeZone;
        }
      }

      return {
        _id: patient?._id.toString(),
        fullName: patient.fullName ?? "Unknown",
        email: patient.email,
        telephone: patient.telephone ?? "Unknown",
        image: patient.image ?? "",
        totalSessions: completedSessions,
        lastAppointment: lastAppointment?.date.toISOString(),
        nextAppointment: nextAppointment?.date.toISOString(),
        timeZone,
      };
    });

    console.log("Patient:", processedPatients);

    return NextResponse.json(processedPatients);
  } catch (error) {
    console.error("Error fetching patients:", error);
    return NextResponse.json(
      { error: "Error fetching patients" },
      { status: 500 }
    );
  }
}