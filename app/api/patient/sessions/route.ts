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
           balanceAmount: 0,
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
        balanceAmount: balance.balanceAmount, // Use balanceAmount as source of truth
        history: (balance.history || []).filter((item: any) => item.plan && item.action === "added") // Keep history for reference only
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
  console.log('=== SESSIONS API CALLED ===');
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
    console.log('🔍 DEBUG - Recurring data received:', requestData.recurring);
    
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

    // Determine payment method based on useBalance flag
    const finalPaymentMethod = useBalance ? 'balance' : (paymentMethod || 'stripe');
    
    console.log('Debug rebook status logic:', {
      paymentMethod,
      useBalance,
      finalPaymentMethod,
      isRebooking,
      hasTherapyId: !!session.user.therapyId,
      therapyId: session.user.therapyId
    });

    await dbConnect();

    // Check patient's balance only if using balance payment
    let balance = null;
    if (finalPaymentMethod !== 'stripe') {
      balance = await Balance.findOne({ user: session.user.id });
      if (!balance) {
        console.log('No balance found for user:', session.user.id);
        return NextResponse.json(
          { error: 'Balance account not found' },
          { status: 404 }
        );
      }
    }

    console.log('Balance check:', {
      userId: session.user.id,
      balanceAmount: balance?.balanceAmount || 'N/A (Stripe payment)',
      requestedPrice: price,
      paymentMethod: finalPaymentMethod
    });

    // Check if user has enough balance (price is already in AED)
    // Skip balance check for Stripe payments
    if (finalPaymentMethod !== 'stripe' && balance && balance.balanceAmount < price) {
      console.log('Insufficient balance:', { balanceAmount: balance.balanceAmount, price });
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
    console.log('Creating appointment with recurring sessions:', {
      recurring,
      recurringLength: recurring ? recurring.length : 0,
      isArray: Array.isArray(recurring)
    });
    
    // Get current user data from database to ensure we have the latest therapyId
    const currentUser = await User.findById(session.user.id);
    const hasCurrentTherapist = !!currentUser?.therapy;
    console.log('Appointment booking context:', {
      userId: session.user.id,
      hasTherapist: hasCurrentTherapist,
      therapyId: currentUser?.therapy,
      isRebooking,
      sessionTherapyId: session.user.therapyId,
      dbTherapyId: currentUser?.therapy
    });

    const appointment = {
      patient: session.user.id,
      therapist: currentUser?.therapy ? new Types.ObjectId(currentUser.therapy.toString()) : null,
      date,
      price,
      plan: isRebooking ? 'Purchased From Rebooking' : planName,
      recurring: Array.isArray(recurring) ? recurring.map((r: any, index: number) => {
        let date;
        
        console.log(`🔄 Processing recurring session ${index + 1}:`, r);
        
        if (typeof r === 'string') {
          // Simple date string - add time from main appointment
          const mainAppointmentTime = new Date(date);
          if (isNaN(mainAppointmentTime.getTime())) {
            console.error('Invalid main appointment date:', date);
            date = r; // Fallback to original date
          } else {
            const recurringDate = new Date(r);
            if (isNaN(recurringDate.getTime())) {
              console.error('Invalid recurring date:', r);
              date = r; // Fallback to original date
            } else {
              recurringDate.setHours(mainAppointmentTime.getHours());
              recurringDate.setMinutes(mainAppointmentTime.getMinutes());
              recurringDate.setSeconds(mainAppointmentTime.getSeconds());
              date = recurringDate.toISOString();
            }
          }
        } else if (r?.date) {
          // Object with date field - PRESERVE individual slot times
          console.log(`🔍 Checking session ${index + 1} date:`, r.date, 'has T?', r.date.includes('T'), 'has space?', r.date.includes(' '));
          if (r.date.includes('T') || r.date.includes(' ')) {
            // Already has time info - use it as is (this is what rebooking sends)
            console.log(`✅ PRESERVING individual time for session ${index + 1}:`, r.date);
            date = r.date; // Keep the individual session time - DO NOT override!
          } else {
            // Only has date - add time from main appointment (for regular booking flow)
            console.log(`⚠️ Adding main appointment time to date-only session ${index + 1}:`, r.date);
            const mainAppointmentTime = new Date(date);
            if (isNaN(mainAppointmentTime.getTime())) {
              console.error('Invalid main appointment date:', date);
              date = r.date; // Fallback to original date
            } else {
              const recurringDate = new Date(r.date);
              if (isNaN(recurringDate.getTime())) {
                console.error('Invalid recurring date:', r.date);
                date = r.date; // Fallback to original date
              } else {
                recurringDate.setHours(mainAppointmentTime.getHours());
                recurringDate.setMinutes(mainAppointmentTime.getMinutes());
                recurringDate.setSeconds(mainAppointmentTime.getSeconds());
                date = recurringDate.toISOString();
              }
            }
          }
        } else {
          date = r;
        }
        
        console.log(`📅 Final date for session ${index + 1}:`, date);
        
        const result = {
          date,
          status: (typeof r === 'object' && r?.status) ? r.status : 'in_progress',
          payment: (typeof r === 'object' && r?.payment) ? r.payment : 'not_paid',
        };
        console.log('🔍 DEBUG - Processed recurring session:', result);
        return result;
      }) : [],
      therapyType: therapyType || therapyTypeText,
        status: (() => {
          if (isRebooking && hasCurrentTherapist) {
            // For rebooking with existing therapist, always confirm immediately
            console.log('Setting status to confirmed (rebooking with existing therapist)');
            return "confirmed";
          }
          if (hasCurrentTherapist) {
            // Patient has therapist assigned - booking from therapist slots should be confirmed
            // Only general booking panel needs therapist acceptance
            console.log('Setting status to confirmed (patient matched, booking from therapist slots)');
            return "confirmed";
          }
          // For new patients without therapist - always pending_match
          console.log('Setting status to pending_match (no therapist assigned)');
          return "pending_match";
        })(),
      paymentStatus: finalPaymentMethod === 'stripe' ? "pending" : "completed",
      hasPreferedDate: false,
      localTimeZone,
      isConfirmed: (() => {
        if (isRebooking) {
          // Rebooking is always confirmed
          return true;
        }
        if (hasCurrentTherapist) {
          // Patient has therapist assigned - appointment is confirmed, don't show in approval section
          return true;
        }
        // Patient has no therapist - show in approval section for admin to assign therapist
        return false;
      })(),
      patientTimezone: localTimeZone,
      isBalance: finalPaymentMethod === 'stripe' ? false : true,
      isStripeVerified: finalPaymentMethod === 'stripe' ? false : true,
      totalSessions: recurring ? (recurring.length + 1) : 1, // Actual number of sessions
      sessionCount: recurring ? (recurring.length + 1) : 1, // Actual number of sessions
      payment: {
        method: finalPaymentMethod === 'stripe' ? 'stripe' : 'balance',
        sessionsPaidWithBalance: finalPaymentMethod === 'stripe' ? 0 : price, // Direct AED amount
        sessionsPaidWithStripe: finalPaymentMethod === 'stripe' ? price : 0, // Direct AED amount
        unitPrice: price, // Actual appointment price
        currency: 'AED',
        useBalance: useBalance || false,
        refundedUnitsFromBalance: 0,
        refundedUnitsFromStripe: 0
      },
      isAccepted: (() => {
        if (isRebooking && hasCurrentTherapist) {
          // Rebooking with existing therapist - already accepted
          return true;
        }
        if (hasCurrentTherapist) {
          // Patient has therapist assigned - appointment is already accepted
          return true;
        }
        // Patient has no therapist - needs admin assignment
        return false;
      })(),
      discountPercentage,
      discount
    }

    // Debug: Log recurring sessions data
    if (recurring && Array.isArray(recurring)) {
      console.log('Recurring sessions times:', recurring.map((r: any) => r?.date || r));
    }

    // Handle balance operations first (before creating appointment)
    if ((finalPaymentMethod !== 'stripe' || useBalance) && balance) {
      // Deduct from balance (skip history for now to avoid schema issues)
      await Balance.updateOne(
        { user: session.user.id },
        {
          $inc: { balanceAmount: -price },
          $set: { updatedAt: new Date() }
        }
      );
    }

    // Create appointment only after balance operations succeed
    let createdAppointment;
    try {
    console.log('Creating appointment with data:', {
      date: appointment.date,
      price: appointment.price,
      priceType: typeof appointment.price,
      sessionCount: appointment.sessionCount,
      totalSessions: appointment.totalSessions,
      recurring: appointment.recurring,
      recurringLength: appointment.recurring?.length,
      paymentMethod: finalPaymentMethod,
      isRebooking,
      status: appointment.status,
      therapist: appointment.therapist,
      hasCurrentTherapist
    });
    console.log('Sessions API - PRICE DEBUGGING:', {
      receivedPrice: price,
      receivedPriceType: typeof price,
      appointmentPrice: appointment.price,
      appointmentPriceType: typeof appointment.price
    });
      
      createdAppointment = await createAppointment(appointment);
      console.log('Created appointment:', createdAppointment);
      console.log('Created appointment ID:', createdAppointment._id);
      console.log('Created appointment status:', createdAppointment.status);
      console.log('Created appointment therapist:', createdAppointment.therapist);
      console.log('Created appointment recurring sessions:', {
        recurring: createdAppointment.recurring,
        recurringLength: createdAppointment.recurring ? createdAppointment.recurring.length : 0
      });
    } catch (createError: any) {
      console.error('Error creating appointment:', createError);
      console.error('Appointment data that failed:', JSON.stringify(appointment, null, 2));
      
      // If appointment creation fails, refund the balance
      if ((finalPaymentMethod !== 'stripe' || useBalance) && balance) {
        await Balance.updateOne(
          { user: session.user.id },
          {
            $inc: { balanceAmount: price }
          }
        );
      }
      
      throw new Error(`Failed to create appointment: ${createError.message}`);
    }

    // Skip history update for now to avoid schema issues
    // TODO: Fix history schema issue and re-enable history tracking

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
      balance: balance ? {
        balanceAmount: balance.balanceAmount
      } : null,
      ok: true,
      message: finalPaymentMethod === 'stripe' ? 'Successfully booked session!' : 'Successfully booked session using your balance!'
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