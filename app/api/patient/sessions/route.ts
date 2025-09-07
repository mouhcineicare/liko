import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import Balance from '@/lib/db/models/Balance';
import Plan from '@/lib/db/models/Plan';
import User from '@/lib/db/models/User';
import Appointment from '@/lib/db/models/Appointment';
import dbConnect from '@/lib/db/connect';
import { authOptions } from '@/lib/auth/config';
import { triggerNewAppointmentEmail } from "@/lib/services/email-triggers";
import { syncAppointmentWithCalendar } from "@/lib/services/google";
import { Types } from 'mongoose';
import { createAppointment } from '@/lib/api/appointments';

const DEFAULT_BALANCE_RATE = 90;

export async function GET(request: Request) {
  try {
    console.log('=== /api/patient/sessions GET START ===');
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log('No session found, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Session found:', { userId: session.user.id, role: session.user.role });
    await dbConnect();
    console.log('Database connected successfully');

    // Get the current user (patient)
    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'patient') {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Get the patient's balance
    const balance = await Balance.findOne({ user: user._id });

    if (!balance) {
      return NextResponse.json({
         balance: {
           totalSessions: 0,
           history: []
         },
         patient: {
             _id: user._id,
             fullName: user.fullName,
             email: user.email
        }
      });
    }
    
    const response = NextResponse.json({
      balance: {
        totalSessions: parseFloat(balance.remainingSessions) * DEFAULT_BALANCE_RATE,
        history: (balance.history || []).filter((item: any) => item.plan && item.action === "added")
      },
      patient: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email
      }
    });
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    console.log('=== /api/patient/sessions GET SUCCESS ===');
    return response;
  } catch (error) {
    console.error('=== /api/patient/sessions GET ERROR ===');
    console.error('Error fetching patient sessions:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized - Please login to continue' },
      { status: 401 }
    );
  }
  if (session.user.role !== 'patient') {
    return NextResponse.json(
      { error: 'Unauthorized - Patient access required' },
      { status: 403 }
    );
  }

  try {
    const requestData = await request.json();
    console.log('Sessions API request data:', requestData);
    
    const {
      date,
      recurring,
      therapyType,
      price,
      plan,
      localTimeZone,
      discountPercentage,
      discount,
      isRebooking,
      paymentMethod,
      useBalance
    } = requestData;

    console.log('Debug rebook status logic:', {
      paymentMethod,
      isRebooking,
      hasTherapyId: !!session.user.therapyId,
      therapyId: session.user.therapyId
    });

    await dbConnect();

    // Check patient's balance
    const balance = await Balance.findOne({ user: session.user.id });
    if (!balance) {
      console.log('No balance found for user:', session.user.id);
      return NextResponse.json(
        { error: 'Balance account not found' },
        { status: 404 }
      );
    }

    // Calculate current balance in AED
    const totalBalanceInAED = balance.totalSessions * DEFAULT_BALANCE_RATE;
    const spentBalanceInAED = balance.spentSessions * DEFAULT_BALANCE_RATE;
    const remainingBalanceInAED = totalBalanceInAED - spentBalanceInAED;

    console.log('Balance check:', {
      userId: session.user.id,
      totalSessions: balance.totalSessions,
      spentSessions: balance.spentSessions,
      totalBalanceInAED,
      spentBalanceInAED,
      remainingBalanceInAED,
      requestedPrice: price
    });

    // Check if user has enough balance (price is already in AED)
    // Skip balance check for Stripe payments
    if (paymentMethod !== 'stripe' && remainingBalanceInAED < price) {
      console.log('Insufficient balance:', { remainingBalanceInAED, price });
      return NextResponse.json(
        { error: 'Insufficient balance for this session' },
        { status: 400 }
      );
    }

    // Update timezone if provided
    if (localTimeZone) {
      await User.findByIdAndUpdate(session.user.id, { timeZone: localTimeZone });
    }

    let planName = 'Balance used';
    if (!isRebooking) {
      // Check if plan exists
      const existPlan = await Plan.findById(plan);
      if (existPlan) {
        planName = existPlan.title;
      }
    }

    const latestAppointment = await Appointment.findOne({ 
      patient: session.user.id 
    }).sort({ createdAt: -1 });
                     
    let therapyTypeText = 'individual';
    if (isRebooking) {
      therapyTypeText = latestAppointment?.therapyType || 'individual';
    }

    // Create appointment
    const appointment = {
      patient: session.user.id,
      therapist: session.user.therapyId ? new Types.ObjectId(session.user.therapyId) : null,
      date,
      price,
      plan: isRebooking ? 'Purchased From Rebooking' : planName,
      recurring: Array.isArray(recurring) ? recurring.map((r: any) => ({
        date: typeof r === 'string' ? r : r?.date,
        status: (typeof r === 'object' && r?.status) ? r.status : 'in_progress',
        payment: (typeof r === 'object' && r?.payment) ? r.payment : 'not_paid',
      })) : [],
      therapyType: therapyType || therapyTypeText,
      status: (() => {
        if (isRebooking && session.user.therapyId) {
          // For rebooking with existing therapist, always confirm immediately
          console.log('Setting status to confirmed (rebooking with existing therapist)');
          return "confirmed";
        }
        if (paymentMethod !== 'stripe') {
          console.log('Setting status to confirmed (balance payment)');
          return "confirmed";
        }
        // For new Stripe payments, start as unpaid until payment completes
        console.log('Setting status to unpaid (new Stripe payment pending)');
        return "unpaid";
      })(),
      paymentStatus: (isRebooking && session.user.therapyId) ? "completed" : (paymentMethod === 'stripe' ? "pending" : "completed"),
      hasPreferedDate: false,
      localTimeZone,
      isConfirmed: (isRebooking && session.user.therapyId) ? true : (paymentMethod === 'stripe' ? false : true),
      patientTimezone: localTimeZone,
      isBalance: paymentMethod === 'stripe' ? false : true,
      isStripeVerified: (isRebooking && session.user.therapyId) ? true : (paymentMethod === 'stripe' ? false : true),
      totalSessions: recurring ? (recurring.length + 1) : 1, // Actual number of sessions
      sessionCount: recurring ? (recurring.length + 1) : 1, // Actual number of sessions
      sessionUnitsTotal: price / DEFAULT_BALANCE_RATE, // Session units for balance calculations
      payment: {
        method: paymentMethod === 'stripe' ? 'stripe' : 'balance',
        sessionsPaidWithBalance: paymentMethod === 'stripe' ? 0 : price / DEFAULT_BALANCE_RATE,
        sessionsPaidWithStripe: paymentMethod === 'stripe' ? price / DEFAULT_BALANCE_RATE : 0,
        unitPrice: DEFAULT_BALANCE_RATE,
        currency: 'AED',
        useBalance: useBalance || false,
        refundedUnitsFromBalance: 0,
        refundedUnitsFromStripe: 0
      },
      isAccepted: isRebooking && session.user.therapyId ? true : (paymentMethod === 'stripe' ? false : true),
      discountPercentage,
      discount
    }

    let createdAppointment;
    try {
      console.log('Creating appointment with data:', {
        date: appointment.date,
        price: appointment.price,
        sessionCount: appointment.sessionCount,
        totalSessions: appointment.totalSessions,
        recurring: appointment.recurring,
        recurringLength: appointment.recurring?.length,
        paymentMethod: paymentMethod,
        isRebooking
      });
      
      createdAppointment = await createAppointment(appointment);
      console.log('Created appointment:', createdAppointment);
      console.log('Created appointment ID:', createdAppointment._id);
    } catch (createError: any) {
      console.error('Error creating appointment:', createError);
      console.error('Appointment data that failed:', JSON.stringify(appointment, null, 2));
      throw new Error(`Failed to create appointment: ${createError.message}`);
    }

    // Only deduct from balance if not using Stripe payment or if useBalance is true
    if (paymentMethod !== 'stripe' || useBalance) {
      // Calculate new spent balance in AED
      const newSpentBalanceInAED = spentBalanceInAED + price;
      const newSpentSessions = newSpentBalanceInAED / DEFAULT_BALANCE_RATE;

      // Update balance
      balance.spentSessions = newSpentSessions;
      balance.updatedAt = new Date();

      // Add to history (store the actual AED amount used)
      balance.history.push({
        action: 'used',
        sessions: price / DEFAULT_BALANCE_RATE, // Convert price to sessions for history
        createdAt: new Date(),
        reason: 'Appointment booking',
        price: price, // Store the actual AED amount
      });

      await balance.save();
    }

    // Calculate remaining balance for response
    let remainingBalanceInAEDAfter, remainingSessions;
    if (paymentMethod !== 'stripe' || useBalance) {
      const newSpentBalanceInAED = spentBalanceInAED + price;
      remainingBalanceInAEDAfter = totalBalanceInAED - newSpentBalanceInAED;
      remainingSessions = remainingBalanceInAEDAfter / DEFAULT_BALANCE_RATE;
    } else {
      remainingBalanceInAEDAfter = remainingBalanceInAED;
      remainingSessions = remainingBalanceInAED / DEFAULT_BALANCE_RATE;
    }

    // Non-critical operations (calendar sync and email)
    try {
      if(session?.user?.therapyId){
        const therapist = await User.findById(session.user.therapyId.toString());
          if(therapist?.googleRefreshToken){
            await syncAppointmentWithCalendar(appointment, therapist, localTimeZone);
          }
      }
    } catch (error) {
      console.error("Calendar sync error:", error);
    }

    try {
      await triggerNewAppointmentEmail(appointment);
    } catch (error) {
      console.error("Email error:", error);
    }

    return NextResponse.json({ 
      appointment: createdAppointment,
      appointmentId: createdAppointment._id,
      balance: {
        remainingSessions: remainingSessions,
        totalSessions: balance.totalSessions,
        spentSessions: balance.spentSessions
      },
      ok: true,
      message: 'Successfully booked session using your balance!'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Sessions API Error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Return more specific error information
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred. Please try again.',
        details: error.message,
        type: error.name
      },
      { status: 500 }
    );
  }
}