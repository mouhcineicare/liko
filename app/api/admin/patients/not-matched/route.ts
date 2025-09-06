import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import User from "@/lib/db/models/User";
import Appointment from "@/lib/db/models/Appointment";
import stripe from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // Query for patients without therapy AND without therapist assigned
    const query = {
      role: 'patient',
      $and: [
        { 
          $or: [
            { therapy: { $exists: false } },
            { therapy: null }
          ]
        },
        {
          $or: [
            { therapist: { $exists: false } },
            { therapist: null }
          ]
        }
      ],
      ...(search && {
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { telephone: { $regex: search, $options: 'i' } }
        ]
      })
    };

    const [patients, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 }) // Changed to -1 for descending order (newest first)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query)
    ]);

    // Get appointments and payment status for each patient
    const patientsWithAppointments = await Promise.all(
      patients.map(async (patient) => {
        // Find ALL appointments for this patient (not just pending)
        const appointments = await Appointment.find({
          patient: patient._id
        })
        .sort({ createdAt: -1 }) // Get most recent appointment first
        .lean();

        // Get the most recent appointment
        const latestAppointment = appointments[0] || null;

        let paymentStatus = 'none';
        let paymentDetails = null;

        if (latestAppointment?.checkoutSessionId) {
          try {
            const session = await stripe.checkout.sessions.retrieve(
              latestAppointment.checkoutSessionId,
              { expand: ['payment_intent'] }
            );
            
            paymentStatus = session.payment_status;
            paymentDetails = {
              amount: session.amount_total ? session.amount_total / 100 : 0,
              currency: session.currency,
              payment_method: session.payment_method_types?.[0] || 'unknown',
              created: new Date(session.created * 1000).toISOString(),
              payment_intent_status: session.payment_intent && typeof session.payment_intent === 'object' 
                ? session.payment_intent.status 
                : undefined
            };
          } catch (error) {
            console.error(`Error fetching Stripe session for appointment ${latestAppointment?._id}:`, error);
            paymentStatus = 'error';
          }
        }

        return {
          ...patient,
          paymentStatus,
          paymentDetails,
          appointment: latestAppointment ? {
            id: latestAppointment._id,
            checkoutSessionId: latestAppointment.checkoutSessionId,
            status: latestAppointment.status,
            createdAt: latestAppointment.createdAt
          } : null,
          totalAppointments: appointments.length
        };
      })
    );

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      patients: patientsWithAppointments,
      pagination: {
        currentPage: page,
        totalPages,
        totalPatients: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching unmatched patients:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch unmatched patients" },
      { status: 500 }
    );
  }
}