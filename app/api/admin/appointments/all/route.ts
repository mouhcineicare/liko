import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import stripe from '@/lib/stripe';

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
    const searchQuery = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    // Build the base query
    let baseQuery = Appointment.find();

    // Add search filter if query exists
    if (searchQuery) {
      const searchRegex = new RegExp(searchQuery, 'i');
      baseQuery = baseQuery
        .populate({
          path: 'patient',
          match: { fullName: searchRegex },
          select: 'fullName'
        })
        .populate({
          path: 'therapist',
          match: { fullName: searchRegex },
          select: 'fullName image'
        });
    } else {
      baseQuery = baseQuery
        .populate('patient', 'fullName')
        .populate('therapist', 'fullName image');
    }

    // Get total count (with same filters)
    const totalCount = await Appointment.countDocuments(
      searchQuery ? {
        $or: [
          { 'patient.fullName': new RegExp(searchQuery, 'i') },
          { 'therapist.fullName': new RegExp(searchQuery, 'i') }
        ]
      } : {}
    );

    // Fetch appointments with pagination and filtering
    const appointments = await baseQuery
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Filter out appointments where populated fields didn't match the search
    const filteredAppointments = searchQuery 
      ? appointments.filter(appt => appt.patient || (appt.therapist && searchQuery))
      : appointments;

    // Enhance appointments with Stripe payment status
    const appointmentsWithPaymentStatus = await Promise.all(
      filteredAppointments.map(async (appointment) => {
        let stripePaymentStatus = 'none';
        
        if (appointment.checkoutSessionId) {
          try {
            const session = await stripe.checkout.sessions.retrieve(
              appointment.checkoutSessionId,
              { expand: ['payment_intent'] }
            );
            
            stripePaymentStatus = session.payment_status || 'none';
            
            // For more detailed status, you could also use:
            // stripePaymentStatus = session.payment_intent?.status || session.payment_status || 'none';
          } catch (error) {
            console.error(`Error fetching Stripe session for appointment ${appointment._id}:`, error);
            stripePaymentStatus = 'error';
          }
        }

        return {
          ...appointment,
          stripePaymentStatus
        };
      })
    );

    return NextResponse.json({
      data: appointmentsWithPaymentStatus,
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
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { error: "Error fetching appointments" },
      { status: 500 }
    );
  }
}