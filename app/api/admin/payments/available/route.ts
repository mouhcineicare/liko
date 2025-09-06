// app/api/payments/route.ts
import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import User from "@/lib/db/models/User";
import { authOptions } from "@/lib/auth/config";
import { getServerSession } from "next-auth";
import { verifyStripePayment } from '@/lib/stripe/verification';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const therapists = await User.find({ role: "therapist" });
    const availablePayments = [];

    for (const therapist of therapists) {
      const appointments = await Appointment.aggregate([
        {
          $match: {
            therapist: therapist._id,
            paymentStatus: "completed",
            status: "completed",
            $or: [
              { therapistPaid: false },
              { therapistPaid: { $exists: false } },
              { therapistPaid: null }
            ]
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "patient",
            foreignField: "_id",
            as: "patient"
          }
        },
        { $unwind: "$patient" },
        {
          $addFields: {
            safeRecurring: { $ifNull: ["$recurring", []] },
            sessionPrice: {
              $cond: {
                if: { $eq: ["$totalSessions", 0] },
                then: 0,
                else: { $divide: ["$price", "$totalSessions"] }
              }
            }
          }
        },
        {
          $addFields: {
            allRecurringSessions: {
              $map: {
                input: "$safeRecurring",
                as: "recItem",
                in: {
                  _id: {
                    $concat: [
                      { $toString: "$_id" },
                      "-",
                      {
                        $cond: [
                          { $eq: [{ $type: "$$recItem" }, "object"] },
                          { $toString: "$$recItem.index" },
                          { $toString: { $indexOfArray: ["$safeRecurring", "$$recItem"] } }
                        ]
                      }
                    ]
                  },
                  index: {
                    $cond: [
                      { $eq: [{ $type: "$$recItem" }, "object"] },
                      "$$recItem.index",
                      { $indexOfArray: ["$safeRecurring", "$$recItem"] }
                    ]
                  },
                  date: {
                    $cond: [
                      { $eq: [{ $type: "$$recItem" }, "object"] },
                      "$$recItem.date",
                      "$$recItem"
                    ]
                  },
                  price: "$sessionPrice",
                  status: {
                    $cond: [
                      { $eq: [{ $type: "$$recItem" }, "object"] },
                      "$$recItem.status",
                      "$status"
                    ]
                  },
                  paymentStatus: {
                    $cond: [
                      { $eq: [{ $type: "$$recItem" }, "object"] },
                      "$$recItem.payment",
                      "$paymentStatus"
                    ]
                  },
                  isMain: {
                    $cond: [
                      { $eq: [{ $type: "$$recItem" }, "object"] },
                      { $eq: ["$$recItem.index", 1000] },
                      false
                    ]
                  }
                }
              }
            }
          }
        },
        { $sort: { date: -1 } },
        {
          $project: {
            _id: 1,
            date: 1,
            price: 1,
            plan: 1,
            status: 1,
            paymentStatus: 1,
            totalSessions: 1,
            checkoutSessionId: 1,
            patient: {
              _id: "$patient._id",
              fullName: "$patient.fullName",
              email: "$patient.email",
              customerId: "$patient.stripeCustomerId"
            },
            sessions: "$allRecurringSessions",
            isPayoutRejected: 1,
            rejectedPayoutNote: 1,
          }
        }
      ]);

      if (appointments.length > 0) {
        const verifiedAppointments = [];
        
        for (const apt of appointments) {
          // Use the verifyStripePayment function
          const {
            paymentStatus,
            subscriptionStatus,
            isActive
          } = await verifyStripePayment(apt.checkoutSessionId, apt.paymentIntentId);

          verifiedAppointments.push({
            ...apt, 
            stripePaymentVerified: paymentStatus === 'paid',
            stripeSubscriptionStatus: subscriptionStatus,
            isStripeActive: isActive || paymentStatus === 'paid'
          });
        }

        const totalAmountForTherapist = verifiedAppointments.reduce((acc, apt) => {
          return acc + apt.sessions.reduce((sAcc: any, s: { paymentStatus: string; price: any; }) => {
            return s.paymentStatus === 'not_paid' ? sAcc + s.price : sAcc;
          }, 0);
        }, 0);

        if (verifiedAppointments.length > 0) {
          availablePayments.push({
            therapistId: therapist._id,
            therapistName: therapist.fullName,
            therapistEmail: therapist.email,
            therapistLevel: therapist.level,
            totalAmount: totalAmountForTherapist,
            appointmentCount: verifiedAppointments.length,
            appointments: verifiedAppointments.map(apt => ({
              ...apt,
              therapist: { _id: therapist._id, level: therapist.level },
              stripeVerified: apt.stripePaymentVerified,
              stripeSubscriptionStatus: apt.stripeSubscriptionStatus,
              isStripeActive: apt.isStripeActive
            }))
          });
        }
      }
    }

    return NextResponse.json(availablePayments);
  } catch (error: any) {
    console.error("Error fetching available payments:", error);
    return NextResponse.json(
      { error: "Error fetching available payments", details: error?.message },
      { status: 500 }
    );
  }
}