import Appointment from '@/lib/db/models/Appointment';
import User from '@/lib/db/models/User';
import TherapistPayment from '@/lib/db/models/TherapistPayment';
import TherapistPayoutInfo from '@/lib/db/models/TherapistPayoutInfo';
import Binance from 'binance-api-node';
import stripe from 'stripe';
import connectDB, { withTransaction } from '../db/connect';

const IS_TEST_MODE = process.env.NODE_ENV === 'development' || process.env.IS_PAYOUT_TEST === 'yes';
const EXCHANGE_RATE = 3.75; // AED to USD
const USDT_DECIMALS = 8;
const DISPLAY_DECIMALS = 3;

const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY!);

function log(message: string, data?: any) {
  console.log(`[${new Date().toISOString()}] ${message}`, data || '');
}

function getBinanceClient() {
  return IS_TEST_MODE 
    ? Binance({
        apiKey: process.env.BINANCE_TEST_API_KEY || 'test_api_key',
        apiSecret: process.env.BINANCE_TEST_API_SECRET || 'test_api_secret',
        httpBase: 'https://testnet.binance.vision',
      })
    : Binance({
        apiKey: process.env.BINANCE_API_KEY!,
        apiSecret: process.env.BINANCE_API_SECRET!,
      });
}

// this is called both for test and prod
async function simulateWithdrawal(client: any, params: any) {
  if (!IS_TEST_MODE) {
    return client.withdraw(params);
  }
  return {
    id: `TEST-${Math.random().toString(36).substring(2, 15)}`,
    ...params,
    status: 1,
    msg: 'Test withdrawal successful'
  };
}

function calculateTherapistPercentage(totalSessions: number): number {
  return totalSessions >= 9 ? 0.57 : 0.5;
}

function toUSDTPrecision(amount: number): number {
  return parseFloat(amount.toFixed(USDT_DECIMALS));
}

async function verifyPayment(appointment: any): Promise<boolean> {
  // Check if paid via balance
  if (appointment.isBalance) {
    return true;
  }

  // Check Stripe payment
  if (!appointment.checkoutSessionId) {
    return false;
  }

  try {
    const stripeSession = await stripeClient.checkout.sessions.retrieve(
      appointment.checkoutSessionId,
      { expand: ['payment_intent', 'subscription'] }
    );

    if (stripeSession.payment_status !== 'paid') {
      return false;
    }

    if (stripeSession.subscription) {
      const subscription = typeof stripeSession.subscription === 'string' 
        ? await stripeClient.subscriptions.retrieve(stripeSession.subscription)
        : stripeSession.subscription;

      if (!['active', 'trialing'].includes(subscription.status)) {
        return false;
      }
    }

    return true;
  } catch (error) {
    log('Payment verification error', error);
    return false;
  }
}

function calculateSessionPayoutAmount(appointment: any, therapistPercentage: number): number {
  const totalSessions = appointment.totalSessions || 1;
  const aedAmountPerSession = (appointment.price * therapistPercentage) / totalSessions;
  const usdAmount = aedAmountPerSession / EXCHANGE_RATE;
  return toUSDTPrecision(usdAmount);
}

// Updated payment service
export async function processCompletedSessionPayment(appointmentId: string, sessionId: string) {
  try {
    log(`Processing payment for appointment ${appointmentId}, session ${sessionId}`);
    
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    const isPaymentVerified = await verifyPayment(appointment);
    if (!isPaymentVerified) {
      // await Appointment.findByIdAndUpdate(appointmentId, {
      //   isPayoutRejected: true,
      //   rejectedPayoutNote: 'Payment verification failed',
      //   $inc: { payoutAttempts: 1 },
      //   lastPayoutAttempt: new Date()
      // });
      return { 
        success: true, // Return success to allow session completion
        paymentProcessed: false,
        error: 'Payment verification failed'
      };
    }

    return withTransaction(async (session) => {
      const txAppointment = await Appointment.findById(appointmentId).session(session);
      if (!txAppointment) {
        throw new Error('Appointment not found in transaction');
      }

      const therapist = await User.findById(txAppointment.therapist).session(session);
      if (!therapist) {
        throw new Error('Therapist not found');
      }

      const payoutInfo = await TherapistPayoutInfo.findOne({ 
        therapist: therapist._id 
      }).session(session);
      
      if (!payoutInfo?.cryptoWallet?.address) {
        // await Appointment.findByIdAndUpdate(
        //   appointmentId,
        //   {
        //     isPayoutRejected: true,
        //     rejectedPayoutNote: 'No valid crypto payment method configured',
        //     $inc: { payoutAttempts: 1 },
        //     lastPayoutAttempt: new Date()
        //   },
        //   { session }
        // );
        return { 
          success: true, // Return success to allow session completion
          paymentProcessed: false,
          error: 'No valid crypto payment method configured'
        };
      }

      const totalSessions = await calculateTotalSessions(
        txAppointment.patient.toString(),
        therapist._id.toString()
      );
      const therapistPercentage = calculateTherapistPercentage(totalSessions);
      const usdAmount = calculateSessionPayoutAmount(txAppointment, therapistPercentage);
      const usdtAmount = toUSDTPrecision(usdAmount);

      const client = getBinanceClient();
      const paymentMethod = payoutInfo.cryptoWallet.currency.toLowerCase();
      const network = payoutInfo.cryptoWallet.network || "BSC";
      const withdrawal = await simulateWithdrawal(client, {
        coin: paymentMethod.toUpperCase(),
        address: payoutInfo.cryptoWallet.address,
        amount: usdtAmount,
        network: network || process.env.BINANCE_PAYMENT_NETWORK || 'BSC',
        name: `Therapist Payment - ${therapist.fullName}`,
      });

      const updatedRecurring = (txAppointment.recurring || []).map(s => {
        if (typeof s === 'string') return { date: s, status: 'completed', payment: 'not_paid' };
        if (s.date === sessionId) return { ...s, payment: 'paid' };
        return s;
      });

      const allSessionsPaid = updatedRecurring.every(s => 
        typeof s === 'object' && s.payment === 'paid'
      ) && txAppointment.status === 'completed';

      const paymentData = {
        therapist: therapist._id,
        amount: usdAmount,
        paymentMethod,
        sessions: [{
          id: sessionId,
          price: usdAmount
        }],
        appointments: [txAppointment._id],
        sessionPrice: usdAmount,
        therapistLevel: therapist.level || 1,
        processedBy: therapist._id,
        status: "completed",
        paidAt: new Date(),
        cryptoAddress: payoutInfo.cryptoWallet.address,
        transactionId: withdrawal.id,
        exchangeRate: EXCHANGE_RATE,
        isTest: IS_TEST_MODE
      };

      await TherapistPayment.create([paymentData], { session });

      await Appointment.findByIdAndUpdate(
        txAppointment._id,
        {
          recurring: updatedRecurring,
          payoutStatus: allSessionsPaid ? 'paid' : 'pending_payout',
          therapistPaid: allSessionsPaid,
          isPaid: allSessionsPaid,
          $inc: { payoutAttempts: 1 },
          lastPayoutAttempt: new Date()
        },
        { session }
      );

      return {
        success: true,
        paymentProcessed: true,
        transactionId: withdrawal.id,
        amount: usdtAmount,
        message: IS_TEST_MODE ? 'Test payment processed' : 'Payment processed'
      };
    });

  } catch (error: any) {
    log('Payment processing failed', error);
    
    // await Appointment.findByIdAndUpdate(
    //   appointmentId,
    //   {
    //     isPayoutRejected: true,
    //     rejectedPayoutNote: error.message || 'Payment processing failed',
    //     $inc: { payoutAttempts: 1 },
    //     lastPayoutAttempt: new Date()
    //   }
    // );

    return {
      success: true, // Still return success to allow session completion
      paymentProcessed: false,
      error: error.message || 'Failed to process payment'
    };
  }
}


async function calculateTotalSessions(patientId: string, therapistId: string): Promise<number> {
  await connectDB();
  
  const appointments = await Appointment.find({
    patient: patientId,
    therapist: therapistId,
    status: 'completed'
  }).lean();

  return appointments.reduce((total, apt) => {
    return total + (apt.recurring.length || 1);
  }, 0);
}