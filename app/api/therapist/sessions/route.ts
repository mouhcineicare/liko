import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import User from "@/lib/db/models/User";
import mongoose from "mongoose";
import stripe from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const searchQuery = searchParams.get('search') || '';
    const planFilter = searchParams.get('plan') || '';
    let statusFilter = searchParams.get('status') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const skip = (page - 1) * limit;

    // Base query conditions that always apply
    let query: any = {
      therapist: new mongoose.Types.ObjectId(session.user.id),
    };

    // Apply search query if present (will search both patient info and plan)
    if (searchQuery) {
      const searchRegex = new RegExp(searchQuery, 'i');
      // Find matching patients assigned to this therapist
      const matchingPatients = await User.find({
        therapy: new mongoose.Types.ObjectId(session.user.id),
        role: 'patient',
        $or: [
          { fullName: { $regex: searchRegex } },
          { email: { $regex: searchRegex } },
          { telephone: { $regex: searchRegex } }
        ]
      }).select('_id');

      const patientIds = matchingPatients.map((p) => p._id);
      if (patientIds.length === 0) {
        return NextResponse.json({
          appointments: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
          statusCounts: {
            all: 0,
            pending_approval: 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0,
          }
        });
      }
      query.patient = { $in: patientIds };
    }

    // Apply plan filter if present (works alongside search)
    if (planFilter && planFilter !== 'all') {
      query.plan = planFilter;
    }

        // Smart status filter using switch statement
    if (statusFilter && statusFilter !== 'all') {
      switch (statusFilter) {
        case 'pending_approval':
          query.$or = [
            { isAccepted: false },
            { status: 'pending_scheduling' }
          ];
          break;
      
        case 'confirmed':
          query.status = 'confirmed';
          break;
        case 'completed':
          query.status = 'completed';
          break;
        case 'cancelled':
          query.status = 'cancelled';
          break;
        default:
          // For any other status, use it directly
          query.status = statusFilter;
      }
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        query.date.$gte = fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        query.date.$lte = toDate;
      }
    }

    // Get total count with current filters
    const totalCount = await Appointment.countDocuments(query);

    // Build and execute the query
    const appointments = await Appointment.find(query)
      .populate('patient', 'fullName email telephone image')
      .populate('therapist', 'fullName image')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Enhance with Stripe data and status mapping
    const enhancedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
        let paymentStatus = 'none';
        let subscriptionStatus = 'none';
        let isActive = false;
        let stripeVerified = false;
        
        if (appointment.checkoutSessionId) {
          try {
            const session = await stripe.checkout.sessions.retrieve(
              appointment.checkoutSessionId,
              { expand: ['payment_intent', 'subscription'] }
            );
            
            paymentStatus = session.payment_status || 'none';
            stripeVerified = paymentStatus === 'paid';
            
            if (session.subscription) {
              const subscription = typeof session.subscription === 'string' 
                ? await stripe.subscriptions.retrieve(session.subscription)
                : session.subscription;
              
              subscriptionStatus = subscription.status || 'none';
              isActive = subscription.status === 'active';
            }
          } catch (error) {
            console.error(`Error fetching Stripe session for appointment ${appointment._id}:`, error);
            paymentStatus = 'error';
            subscriptionStatus = 'error';
          }
        }

        // Return the original status if no filter is applied
        // Or return the filtered status if a filter is applied
        const displayStatus = statusFilter && statusFilter !== 'all' 
          ? statusFilter 
          : appointment.status;

        return {
          ...appointment,
          status: displayStatus, // Use either the filtered status or original status
          stripePaymentStatus: paymentStatus,
          stripeSubscriptionStatus: subscriptionStatus,
          isStripeActive: isActive || paymentStatus === 'paid',
          stripeVerified
        };
      })
    );

    // Get counts for all statuses with current filters (except status)
    const getFilteredCounts = async () => {
      const baseQuery: any = { therapist: new mongoose.Types.ObjectId(session.user.id) };
      if (query.patient) baseQuery.patient = query.patient;
      if (query.plan) baseQuery.plan = query.plan;
      if (query.date) baseQuery.date = query.date;

      const counts = {
        all: await Appointment.countDocuments(baseQuery),
        pending_approval: await Appointment.countDocuments({
          ...baseQuery,
          $or: [
            { isAccepted: false },
            { status: 'pending_scheduling' }
          ]
        }),
        confirmed: await Appointment.countDocuments({
          ...baseQuery,
          $or: [
            { 
              isConfirmed: true, 
              isAccepted: true 
            },
            { 
              status: 'approved' 
            }
          ]
        }),
        completed: await Appointment.countDocuments({
          ...baseQuery,
          status: 'completed'
        }),
        cancelled: await Appointment.countDocuments({
          ...baseQuery,
          status: 'cancelled'
        })
      };

      return counts;
    };

    const statusCounts = await getFilteredCounts();

    return NextResponse.json({
      appointments: enhancedAppointments,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1,
      },
      statusCounts
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { error: "Error fetching appointments" },
      { status: 500 }
    );
  }
}