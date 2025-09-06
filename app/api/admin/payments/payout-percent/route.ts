import { authOptions } from "@/lib/auth/config";
import { Appointment } from "@/lib/db/models";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import stripe from "@/lib/stripe";
import { IAppointment } from "@/lib/db/models/Appointment";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId")?.toString() || '';
    const therapistId = searchParams.get("therapistId")?.toString() || '';

    try {
        // Fetch all completed appointments
        const appointments = await Appointment.find({
            status: 'completed',
            patient: new mongoose.Types.ObjectId(patientId),
            therapist: new mongoose.Types.ObjectId(therapistId)
        });

        const countAll = appointments.length;

        // Process appointments in parallel
        const verificationResults = await Promise.all(
            appointments.map(async (appointment) => {
                let isPaid = false;
                let verificationError = null;

                if (appointment.checkoutSessionId) {
                    try {
                        const stripeSession = await stripe.checkout.sessions.retrieve(
                            appointment.checkoutSessionId,
                            { expand: ['payment_intent'] }
                        );
                        isPaid = stripeSession.payment_status === 'paid';
                    } catch (error) {
                        console.error(`Error verifying Stripe payment for session ${appointment.checkoutSessionId}:`, error);
                        verificationError = error;
                    }
                }

                return {
                    appointment,
                    isPaid,
                    verificationError
                };
            })
        );

        // Separate verified and unverified appointments
        const verifiedAppointments = verificationResults
            .filter(result => result.isPaid)
            .map(result => result.appointment);

        const unverifiedAppointments = verificationResults
            .filter(result => !result.isPaid)
            .map(result => result.appointment);

        // Count all sessions (including recurring ones)
        const countVerifiedSessions = verifiedAppointments.reduce((total, appointment) => {
            // +1 for the main session, + recurring sessions if they exist
            return total + 1 + (appointment.recurring?.length || 0);
        }, 0);

        return NextResponse.json({
            count: countVerifiedSessions,
            allVerifiedSessions: verifiedAppointments,
            AllUnverifiedSessions: unverifiedAppointments,
            countAll
        }, { status: 200 });

    } catch (error) {
        console.error("Error fetching appointments:", error);
        return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
    }
}