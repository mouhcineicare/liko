export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import TherapistPayoutInfo from "@/lib/db/models/TherapistPayoutInfo";
import { triggerPaymentDetailsUpdateEmail } from "@/lib/services/email-triggers";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const therapistId = url.searchParams.get('therapistId');
    await connectDB();
    
    let details;
    if (therapistId) {
      details = await TherapistPayoutInfo.findOne({ therapist: therapistId });
    } else {
      const session = await getServerSession(authOptions);
      if (!session || session.user.role !== "therapist") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      details = await TherapistPayoutInfo.findOne({ therapist: session.user.id });
    }

    // Transform data to match frontend structure
    const responseData = details ? {
      bankDetails: details.bankDetails || {
        accountName: "",
        accountNumber: "",
        routingNumber: "",
        swiftCode: "",
        bankName: ""
      },
      cryptoWallet: details.cryptoWallet || {
        address: "",
        currency: "USDT",
        network: "BSC"
      },
      paymentLink: details.paymentLink || "",
      payoutSettings: details.payoutSettings || {
        schedule: 'manual',
        minimumAmount: 0,
        nextPayoutDate: null,
        payoutFrequency: 'weekly',
        expectedPayoutDate: calculateNextPayoutDate('weekly')
      },
      lastUpdated: details.lastUpdated
    } : {
      bankDetails: {
        accountName: "",
        accountNumber: "",
        routingNumber: "",
        swiftCode: "",
        bankName: ""
      },
      cryptoWallet: {
        address: "",
        currency: "USDT",
        network: "BSC"
      },
      paymentLink: "",
      payoutSettings: {
        schedule: 'manual',
        minimumAmount: 0,
        nextPayoutDate: null,
        payoutFrequency: 'weekly',
        expectedPayoutDate: calculateNextPayoutDate('weekly')
      },
      lastUpdated: null
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching payout info:", error);
    return NextResponse.json(
      { error: "Error fetching payout info" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    await connectDB();

    let details = await TherapistPayoutInfo.findOne({ therapist: session.user.id });
    if (!details) {
      details = new TherapistPayoutInfo({ therapist: session.user.id });
    }

    // Update bank details
    details.bankDetails = data.bankDetails || {
      accountName: "",
      accountNumber: "",
      routingNumber: "",
      swiftCode: "",
      bankName: ""
    };

    // Update crypto wallet - ensure both address and currency are properly saved
    details.cryptoWallet = {
      address: data.cryptoWallet?.address || "",
      currency: data.cryptoWallet?.currency || "USDT", // Default to USDT if not provided,
      network: data.cryptoWallet?.network || "BSC"
    };

    // Update payment link
    details.paymentLink = data.paymentLink || "";

    // Update payout settings with proper validation
    const schedule = data.payoutSettings?.schedule || 'manual';
    details.payoutSettings = {
      schedule: schedule,
      minimumAmount: data.payoutSettings?.minimumAmount || 0,
      expectedPayoutDate: calculateNextPayoutDate(schedule),
      nextPayoutDate: calculateNextPayoutDate(schedule),
      payoutFrequency: schedule
    };

    details.lastUpdated = new Date();

    await details.save();

    await triggerPaymentDetailsUpdateEmail(details);

    return NextResponse.json({ 
      success: true,
      message: "Payout info updated successfully",
      data: details // Return saved data for verification
    });
  } catch (error) {
    console.error("Error updating payout info:", error);
    return NextResponse.json(
      { error: "Error updating payout info" },
      { status: 500 }
    );
  }
}


export function calculateNextPayoutDate(schedule: string): Date | null {
  if (schedule === 'manual') {
    return null;
  }

  const now = new Date();
  const date = new Date(now);

  switch (schedule) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      // Default to next Friday at 12 PM
      date.setDate(date.getDate() + ((5 - date.getDay() + 7) % 7));
      break;
  }

  // Set to 12 PM
  date.setHours(12, 0, 0, 0);
  return date;
}

