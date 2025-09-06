import { Appointment, PaymentLog, User } from "../db/models";
import { IAppointment } from "../db/models/Appointment";
import TherapistPayoutInfo from "../db/models/TherapistPayoutInfo";
import Binance from 'binance-api-node';
import { NextResponse } from 'next/server';
import stripe from '@/lib/stripe';

const USDT_DECIMALS = 8;
const DISPLAY_DECIMALS = 3;
const MIN_WITHDRAWAL_AMOUNT = 1;
const MAX_WITHDRAWAL_AMOUNT = 999;

const binanceClient = Binance({
  apiKey: process.env.BINANCE_API_KEY!,
  apiSecret: process.env.BINANCE_API_SECRET!,
});

// Fetch therapist details including wallet address and level
export async function fetchTherapistDetails(therapistId: string) {
  const therapist = await User.findById(therapistId).lean();
  if (!therapist) throw new Error('Therapist not found');

  const payoutInfo = await TherapistPayoutInfo.findOne({ therapist: therapistId }).lean();
  if (!payoutInfo) throw new Error('Payout info not found');
  
  return {
    ...therapist,
    paymentDetails: {
      walletAddress: payoutInfo?.otherPaymentDetails || null,
      payoutPercentage: therapist?.level === 2 ? 0.57 : 0.50
    }
  };
}

// Get current AED to USDT exchange rate
export async function getCurrentExchangeRate(): Promise<number> {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await response.json();
    
    if (data.result === 'success' && data.rates?.AED) {
      return data.rates.AED;
    }
    throw new Error('Failed to get exchange rate');
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    // Fallback to default rate
    return 3.67;
  }
}

// Process payout to therapist via Binance
export async function processPayoutToTherapist(
  therapistId: string, 
  amountAED: number
) {
  try {
    // Get therapist details
    const therapist = await fetchTherapistDetails(therapistId);
    const walletAddress = therapist.paymentDetails.walletAddress;
    
    if (!walletAddress) {
      throw new Error('No wallet address configured');
    }

    // Convert AED to USDT
    const exchangeRate = await getCurrentExchangeRate();
    const usdtAmount = parseFloat((amountAED / exchangeRate).toFixed(USDT_DECIMALS));
    
    // Validate amount
    if (usdtAmount < MIN_WITHDRAWAL_AMOUNT || usdtAmount >= MAX_WITHDRAWAL_AMOUNT) {
      throw new Error(
        `Amount must be between ${MIN_WITHDRAWAL_AMOUNT} and ${MAX_WITHDRAWAL_AMOUNT - 0.00000001} USDT`
      );
    }

    // Process Binance payout
    const withdrawal = await binanceClient.withdraw({
      coin: 'USDT',
      address: walletAddress,
      amount: usdtAmount,
      network: process.env.BINANCE_PAYMENT_NETWORK || 'BSC',
      name: `Therapist Payment - ${therapist.fullName}`,
    });

    return {
      success: true,
      transactionId: withdrawal.id,
      amountAED,
      usdtAmount: parseFloat(usdtAmount.toFixed(DISPLAY_DECIMALS)),
      exchangeRate
    };
  } catch (error: any) {
    console.error('Payout failed:', error);
    
    let errorMessage = error.message || 'Failed to process Binance payment';
    if (error.code === -2010) errorMessage = "Insufficient balance for withdrawal";
    else if (error.code === -2011) errorMessage = "Invalid withdrawal address";
    else if (error.code === -2015) errorMessage = "Invalid API key or permissions";

    throw new Error(errorMessage);
  }
}

// Main payout processing function
export async function processPayouts() {
  try {
    // Find eligible appointments (completed sessions not paid)
    const pendingAppointments = await Appointment.find({
      $or: [
        { 
          status: 'completed',
          payoutStatus: 'pending_payout',
          paymentStatus: 'completed'
        },
        {
          'recurring.status': 'completed',
          'recurring.payment': 'not_paid',
          paymentStatus: 'completed'
        }
      ],
      payoutAttempts: { $lt: 3 },
      paymentIntentId: { $exists: true }
    }).populate('therapist', 'level');

    const results = await Promise.allSettled(
      pendingAppointments.map(processSingleAppointmentPayout)
    );

    return {
      successCount: results.filter(r => r.status === 'fulfilled').length,
      failureCount: results.filter(r => r.status === 'rejected').length,
      totalProcessed: pendingAppointments.length
    };
  } catch (error) {
    console.error('Payout processing failed:', error);
    throw error;
  }
}

// Process payout for a single appointment
async function processSingleAppointmentPayout(appointment: IAppointment) {
  try {
    // Verify payment with Stripe
    const verification = await verifyPaymentWithStripe(appointment._id.toString());
    
    if (!verification.verified) {
      throw new Error(`Payment not verified: ${verification.reason || verification.paymentStatus || 'Unknown error'}`);
    }

    // Calculate payout amount based on completed sessions
    const { payoutAmount, sessionsToPay } = calculatePayoutAmount(appointment);
    
    // Process payout
    const payoutResult = await processPayoutToTherapist(
      appointment.therapist.toString(),
      payoutAmount
    );

    // Update appointment records
    await updateAppointmentPaymentStatus(appointment, sessionsToPay, payoutResult);

    return { success: true, appointmentId: appointment._id };
  } catch (error: any) {
    await handlePayoutFailure(appointment, error);
    throw error;
  }
}

// Verify payment with Stripe (linked to your existing API)
async function verifyPaymentWithStripe(appointmentId: string) {
  try {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return { verified: false, reason: 'Appointment not found' };
    }

    const payment = await stripe.paymentIntents.retrieve(appointment.paymentIntentId as string);
    
    const isPaid = payment.status === 'succeeded';
    const amountMatches = payment.amount === Math.round(appointment.price * 100);

    return {
      verified: isPaid && amountMatches,
      paymentStatus: payment.status,
      amountPaid: payment.amount / 100,
      currency: payment.currency
    };
  } catch (error: any) {
    console.error('Payment verification failed:', error);
    return { verified: false, reason: error.message };
  }
}

// Calculate payout amount and identify sessions to pay
function calculatePayoutAmount(appointment: IAppointment) {
  let payoutAmount = 0;
  const sessionsToPay: any[] = [];

  // Therapist payout percentage
  const therapistLevel = appointment.therapist?.level || 1;
  const payoutPercentage = therapistLevel === 2 ? 0.57 : 0.50;

  // Process recurring sessions
  if (appointment.recurring && appointment.recurring.length > 0) {
    appointment.recurring.forEach((session: any) => {
      if (typeof session === 'object' && 
          session.status === 'completed' && 
          session.payment === 'not_paid') {
        const sessionPrice = session.price || (appointment.price / appointment.totalSessions);
        payoutAmount += sessionPrice * payoutPercentage;
        sessionsToPay.push(session);
      }
    });
  }

  // Process main session
  if (appointment.status === 'completed' && 
      appointment.payoutStatus === 'pending_payout') {
    payoutAmount += appointment.price * payoutPercentage;
    sessionsToPay.push({ isMainSession: true });
  }

  if (payoutAmount === 0) {
    throw new Error('No payable sessions found');
  }

  return { payoutAmount, sessionsToPay };
}

// Update appointment after successful payout
async function updateAppointmentPaymentStatus(
  appointment: IAppointment,
  sessionsToPay: any[],
  payoutResult: any
) {
  const updateData: any = {
    $inc: { payoutAttempts: 1 },
    lastPayoutAttempt: new Date()
  };

  // Update recurring sessions payment status
  if (sessionsToPay.some(s => !s.isMainSession)) {
    updateData.$set = { 'recurring.$[elem].payment': 'paid' };
    updateData.arrayFilters = [{
      'elem.status': 'completed',
      'elem.payment': 'not_paid'
    }];
  }

  // Update main session status
  if (sessionsToPay.some(s => s.isMainSession)) {
    updateData.payoutStatus = 'paid';
  }

  await Appointment.findByIdAndUpdate(appointment._id, updateData);

  // Create payment log
  await PaymentLog.create({
    appointment: appointment._id,
    therapist: appointment.therapist,
    amount: payoutResult.amountAED,
    paymentMethod: 'binance',
    status: 'success',
    transactionId: payoutResult.transactionId,
    sessionsPaid: sessionsToPay.map(s => s.index || 'main')
  });
}

// Handle payout failures
async function handlePayoutFailure(appointment: any, error: Error) {
  await Appointment.findByIdAndUpdate(appointment._id, {
    $inc: { payoutAttempts: 1 },
    lastPayoutAttempt: new Date()
  });

  await PaymentLog.create({
    appointment: appointment._id,
    therapist: appointment.therapist,
    amount: appointment.price * (appointment.therapist?.level === 2 ? 0.57 : 0.50),
    paymentMethod: 'binance',
    status: 'failed',
    errorMessage: error.message
  });
}

// Send payout report to admin
export async function sendPayoutReport(result: any) {
  try {
    // In production: Send actual email using your email service
    console.log('Payout Report:', {
      date: new Date().toISOString(),
      success: result.successCount,
      failed: result.failureCount,
      total: result.totalProcessed
    });
    
    // Example using SendGrid:
    /*
    await sgMail.send({
      to: 'admin@example.com',
      from: 'payouts@yourdomain.com',
      subject: `Payout Report - ${new Date().toLocaleDateString()}`,
      text: `Processed ${result.successCount} payouts, ${result.failureCount} failed`
    });
    */
  } catch (error) {
    console.error('Failed to send payout report:', error);
  }
}

// API endpoint handler
export async function handlePayoutRequest() {
  try {
    const pendingPayouts = await Appointment.find({
      isPaid: false || null,
      paymentStatus: 'completed',
      paymentIntentId: { $exists: true },
      payoutAttempts: { $lt: 3 } // Max 3 attempts
    });

    const results = await Promise.allSettled(
      pendingPayouts.map(processSingleAppointmentPayout)
    );

    return NextResponse.json({
      processed: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length
    });
  } catch (error) {
    console.error('Payout processing failed:', error);
    return NextResponse.json(
      { error: 'Payout processing failed' },
      { status: 500 }
    );
  }
}