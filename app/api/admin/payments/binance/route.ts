import { NextResponse } from "next/server";
import Binance from 'binance-api-node';
import { authOptions } from "@/lib/auth/config";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import User from "@/lib/db/models/User";
import TherapistPayment from "@/lib/db/models/TherapistPayment";
import mongoose from "mongoose";

export const dynamic = 'force-dynamic';

const USDT_DECIMALS = 8;
const DISPLAY_DECIMALS = 3;
const MIN_WITHDRAWAL_AMOUNT = 1;
const MAX_WITHDRAWAL_AMOUNT = 999;
const IS_TEST_MODE = process.env.NODE_ENV === 'development'; // or use a specific env var like BINANCE_TEST_MODE

function toUSDTPrecision(amount: number): number {
  return parseFloat(amount.toFixed(USDT_DECIMALS));
}

function getBinanceClient() {
  if (IS_TEST_MODE) {
    console.log('[BINANCE] Using testnet API');
    return Binance({
      apiKey: process.env.BINANCE_TEST_API_KEY || '30c5FJxWKlJ0EBmM5zAKXGGiWOEeOHNAIESIxUDzzYLMyfKf2Gm4yZzO5OViwheA',
      apiSecret: process.env.BINANCE_TEST_API_SECRET || 'vTv9OgYfnNhkPb5RuSfeIDp1TuQVkjk6j2R5HVOR35sLiiXFECAEdtuU9fqHmCzZ',
      httpBase: 'https://testnet.binance.vision', // Testnet endpoint
    });
  }
  
  return Binance({
    apiKey: process.env.BINANCE_API_KEY!,
    apiSecret: process.env.BINANCE_API_SECRET!,
  });
}

async function simulateWithdrawal(client: any, params: any) {
  if (!IS_TEST_MODE) {
    return client.withdraw(params);
  }

  // In test mode, simulate a successful withdrawal
  console.log('[BINANCE TEST] Simulating withdrawal:', params);
  return {
    id: `TEST-${Math.random().toString(36).substring(2, 15)}`,
    ...params,
    status: 1, // 1 means success in Binance API
    msg: 'Test withdrawal successful'
  };
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { 
      walletAddress,
      therapistId,
      sessions,
      therapistLevel,
      exchangeRate,
      amount,
      currency,
      payoutPercentage,
      network
    } = await req.json();

    // Validation (keep your existing validation code)
    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json(
        { error: "Valid wallet address is required" },
        { status: 400 }
      );
    }

    if (!therapistId || !sessions?.length || therapistLevel === undefined || !exchangeRate || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const usdtAmount = toUSDTPrecision(amount);
    const amountInSatoshis = usdtAmount * 10**USDT_DECIMALS;
    
    if (!Number.isInteger(amountInSatoshis)) {
      return NextResponse.json(
        { error: "Withdrawal amount USDT must be an integer of 0.00000001" },
        { status: 400 }
      );
    }
      
    if (usdtAmount < MIN_WITHDRAWAL_AMOUNT || usdtAmount >= MAX_WITHDRAWAL_AMOUNT) {
      return NextResponse.json(
        { error: `Amount must be between ${MIN_WITHDRAWAL_AMOUNT} and ${MAX_WITHDRAWAL_AMOUNT - 0.00000001} USDT` },
        { status: 400 }
      );
    }

    // Verify therapist exists
    const therapist = await User.findById(therapistId);
    if (!therapist) {
      return NextResponse.json(
        { error: "Therapist not found" },
        { status: 404 }
      );
    }

    // Group sessions by appointment ID (keep your existing code)
    const sessionsByAppointment: Record<string, { 
      ids: string[], 
      prices: number[],
      amount: number 
    }> = {};
    const appointmentIds: string[] = [];

    for (const session of sessions) {
      const [appointmentId] = session.id.split('-');
      
      if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
        return NextResponse.json(
          { error: `Invalid appointment ID format: ${appointmentId}` },
          { status: 400 }
        );
      }

      if (!sessionsByAppointment[appointmentId]) {
        sessionsByAppointment[appointmentId] = { ids: [], prices: [], amount: 0 };
        appointmentIds.push(appointmentId);
      }
      sessionsByAppointment[appointmentId].ids.push(session.id);
      sessionsByAppointment[appointmentId].prices.push(session.price);
      sessionsByAppointment[appointmentId].amount += session.price;
    }

    // Verify all appointments exist (keep your existing code)
    const appointments = await Appointment.find({
      _id: { $in: appointmentIds },
      therapist: therapistId
    });

    if (appointments.length !== appointmentIds.length) {
      const missingIds = appointmentIds.filter(id => 
        !appointments.some(a => a._id.toString() === id)
      );
      return NextResponse.json(
        { error: `Appointments not found: ${missingIds.join(', ')}` },
        { status: 404 }
      );
    }

    const isTestEnv = process.env.NODE_ENV === 'development';

    // Process Binance payment
    const client = Binance({
      apiKey: isTestEnv 
        ? process.env.BINANCE_TEST_API_KEY!
        : process.env.BINANCE_API_KEY!,
      apiSecret: isTestEnv 
        ? process.env.BINANCE_TEST_API_SECRET!
        : process.env.BINANCE_API_SECRET!,
      // Add testnet flag if in development
      ...(isTestEnv && { 
        baseUrl: 'https://testnet.binance.vision',
        httpBase: 'https://testnet.binance.vision',
        wsBase: 'wss://testnet.binance.vision/ws'
      })
    });


   let withdrawal;
if (isTestEnv) {
  withdrawal = { id: `test-tx-${Date.now()}` }; // mock response
  console.log("[BINANCE PAYMENT] Skipping real withdrawal in test mode.");
} else {
  withdrawal = await client.withdraw({
    coin: currency || "USDT",
    address: walletAddress,
    amount: usdtAmount,
    network: network || process.env.BINANCE_PAYMENT_NETWORK || 'BSC',
    name: `Therapist Payment - ${therapist.fullName}`,
  });
}

    console.log('[BINANCE PAYMENT] Withdrawal successful. Transaction ID:', withdrawal.id);

    // Create payment records (keep your existing code)
    const paymentRecords = [];
    for (const appointmentId in sessionsByAppointment) {
      const { ids, prices, amount: appointmentAmount } = sessionsByAppointment[appointmentId];
      
      const paymentData = {
        therapist: therapistId,
        amount: parseFloat(amount) * (parseFloat(payoutPercentage) * 0.01),
        paymentMethod: currency || "usdt",
        sessions: ids.map((id, idx) => ({
          id,
          price: prices[idx]
        })),
        appointments: [appointmentId],
        sessionPrice: prices[0],
        therapistLevel,
        processedBy: session.user.id,
        status: "completed",
        paidAt: new Date(),
        cryptoAddress: walletAddress,
        transactionId: withdrawal.id,
        exchangeRate,
        isTest: IS_TEST_MODE // Mark test payments
      };

      const payment = await TherapistPayment.create(paymentData);
      paymentRecords.push(payment);
    }

    // Update appointment sessions (keep your existing code)
    for (const appointment of appointments) {
      const { ids: sessionIdsForAppointment, prices, amount: appointmentAmount } = 
        sessionsByAppointment[appointment._id.toString()];

      let updatedRecurring = (appointment.recurring || []).map((s: any, idx: number) => {
        if (typeof s === 'object' && s.index !== undefined) return s;
        if (typeof s === 'string') return { date: s, status: 'completed', payment: 'not_paid', index: idx };
        return { date: new Date().toISOString(), status: 'completed', payment: 'not_paid', index: idx };
      });

      let isCurrentSessionPaid = false;

      for (let i = 0; i < sessionIdsForAppointment.length; i++) {
        const sessionId = sessionIdsForAppointment[i];
        const [_, sessionIndexStr] = sessionId.split('-');
        const index = sessionIndexStr === '1000' ? 1000 : parseInt(sessionIndexStr);
        
        if (isNaN(index)) continue;

        if (index === 1000) {
          isCurrentSessionPaid = true;
          continue;
        }

        const sessionIndex = updatedRecurring.findIndex(s => s.index === index);
        if (sessionIndex !== -1) {
          updatedRecurring[sessionIndex] = {
            ...updatedRecurring[sessionIndex],
            payment: 'paid',
            price: prices[i]
          };
        } else {
          updatedRecurring.push({
            date: new Date().toISOString(),
            status: 'completed',
            payment: 'paid',
            index,
            price: prices[i]
          });
        }
      }

      updatedRecurring.sort((a, b) => a.index - b.index);

      const updateData: any = {
        recurring: updatedRecurring,
        $inc: { paidAmount: appointmentAmount },
        therapistPaid: updatedRecurring.every(s => s.payment === 'paid')
      };

      if (isCurrentSessionPaid) {
        updateData.therapistPaid = true;
      }

      await Appointment.findByIdAndUpdate(
        appointment._id, 
        { $set: updateData },
        { new: true }
      );
    }

    return NextResponse.json({
      success: true,
      paymentIds: paymentRecords.map(p => p._id),
      transactionId: withdrawal.id,
      amount: parseFloat(usdtAmount.toFixed(DISPLAY_DECIMALS)),
      message: IS_TEST_MODE ? "Test payment processed successfully" : "Payment processed successfully",
      isTest: IS_TEST_MODE
    });

  } catch (error: any) {
    console.error("[BINANCE PAYMENT] Error:", error);
    
    let errorMessage = error.message || 'Failed to process Binance payment';
    if (error.code === -2010) errorMessage = "Insufficient balance for withdrawal";
    else if (error.code === -2011) errorMessage = "Invalid withdrawal address";
    else if (error.code === -2015) errorMessage = "Invalid API key or permissions";

    return NextResponse.json(
      { error: errorMessage, ...(error.code && { code: error.code }) },
      { status: 500 }
    );
  }
}