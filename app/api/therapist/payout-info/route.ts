export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import TherapistPayoutInfo from "@/lib/db/models/TherapistPayoutInfo";
import { triggerPaymentDetailsUpdateEmail } from "@/lib/services/email-triggers";
import { User } from "@/lib/db/models";

// Helper function to calculate default payout date
function getDefaultPayoutDate(frequency: 'weekly' | 'biweekly' | 'monthly' | 'manual' = 'weekly') {
  const date = new Date();
  
  if (frequency === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else if (frequency === 'biweekly') {
    date.setDate(date.getDate() + 14);
  } else if (frequency === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  }
  
  date.setHours(12, 0, 0, 0); // Set to 12 PM
  return date;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const therapistId = url.searchParams.get('therapistId');
    
    if (!therapistId) {
      return NextResponse.json({ error: "Therapist ID is required" }, { status: 400 });
    }

    await connectDB();
    let payoutInfo = await TherapistPayoutInfo.findOne({ therapist: therapistId });

    if (!payoutInfo) {
      // Return default structure if no payout info exists
      return NextResponse.json({
        payoutSettings: {
          schedule: 'weekly',
          minimumAmount: 0,
          nextPayoutDate: getDefaultPayoutDate('weekly'),
          expectedPayoutDate: getDefaultPayoutDate('weekly')
        },
        bankDetails: {
          accountName: '',
          accountNumber: '',
          routingNumber: '',
          swiftCode: '',
          bankName: ''
        },
        otherPaymentDetails: '',
        paymentLink: ''
      });
    }

    return NextResponse.json(payoutInfo);
  } catch (error) {
    console.error("Error fetching payout info:", error);
    return NextResponse.json(
      { error: "Error fetching payout info" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { therapistId, payoutData } = await req.json();

    console.log('data', therapistId, payoutData)
    
    if (!therapistId) {
      return NextResponse.json({ error: "Therapist ID is required" }, { status: 400 });
    }

    await connectDB();

    // Calculate expected payout date based on schedule
    const expectedPayoutDate = payoutData.payoutSettings?.schedule === 'manual' 
      ? null 
      : calculateNextPayoutDate(payoutData.payoutSettings?.schedule || 'weekly');

      console.log('expectedPayoutDate', expectedPayoutDate)

    // Prepare update data
    const updateData = {
      lastUpdated: new Date(),
      payoutSettings: {
         schedule: payoutData.payoutSettings?.schedule || 'weekly',
         minimumAmount: payoutData.payoutSettings?.minimumAmount || 0,
         expectedPayoutDate: expectedPayoutDate,
         payoutFrequency:  payoutData.payoutSettings?.schedule || 'weekly',
         nextPayoutDate: expectedPayoutDate
      },
    //   'payoutSettings.schedule': payoutData.payoutSettings?.schedule || 'weekly',
    //   'payoutSettings.minimumAmount': payoutData.payoutSettings?.minimumAmount || 0,
    //   'payoutSettings.expectedPayoutDate': expectedPayoutDate,
      bankDetails: payoutData.bankDetails || {},
      otherPaymentDetails: payoutData.otherPaymentDetails || '',
      paymentLink: payoutData.paymentLink || ''
    };

    console.log('updateData',updateData)

    // Update the payout info (using upsert to create if doesn't exist)
    const payoutInfo = await TherapistPayoutInfo.findOneAndUpdate(
      { therapist: therapistId },
      updateData,
      { 
        new: true,
        upsert: true,
        setDefaultsOnInsert: true 
      }
    );

    console.log('payoutInfo', payoutInfo)

    return NextResponse.json({ 
      success: true,
      message: "Payout info updated successfully",
      data: payoutInfo
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