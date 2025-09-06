import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import User from "@/lib/db/models/User";
import { authOptions } from "@/lib/auth/config";
import { getServerSession } from "next-auth";

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
            status: { $ne: "completed" },
          }
        },
        {
          $lookup: {
            from: "therapistpayments",
            let: { appointmentId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$$appointmentId", "$appointments"]
                  }
                }
              }
            ],
            as: "therapistPaymentsMade"
          }
        },
        {
          $addFields: {
            sessionPrice: {
              $cond: {
                if: { $eq: ["$totalSessions", 0] },
                then: 0,
                else: { $divide: ["$price", "$totalSessions"] }
              }
            },
            therapistPaidSessionIds: {
              $reduce: {
                input: "$therapistPaymentsMade",
                initialValue: [],
                in: {
                  $concatArrays: ["$$value", { $ifNull: ["$$this.sessions", []] }]
                }
              }
            }
          }
        },
        {
          $addFields: {
            mainSession: {
              $cond: [
                { $eq: ["$status", "completed"] },
                {
                  _id: { $concat: [{ $toString: "$_id" }, "-main"] },
                  date: "$date",
                  price: "$sessionPrice",
                  status: "$status",
                  paymentStatus: "$paymentStatus",
                  isMain: true
                },
                null
              ]
            },
            allRecurringSessions: {
              $cond: {
                if: {
                  $and: [
                    { $gt: ["$totalSessions", 1] },
                    { $ne: [{ $type: "$recurring" }, "missing"] },
                    { $gt: [{ $size: "$recurring" }, 0] }
                  ]
                },
                then: {
                  $map: {
                    input: "$recurring",
                    as: "recItem",
                    in: {
                      _id: {
                        $concat: [
                          { $toString: "$_id" },
                          "-",
                          {
                            $toString: {
                              $add: [
                                {
                                  $ifNull: [
                                    {
                                      $cond: [
                                        { $eq: [{ $type: "$$recItem" }, "object"] },
                                        "$$recItem.index",
                                        null
                                      ]
                                    },
                                    { $indexOfArray: ["$recurring", "$$recItem"] }
                                  ]
                                },
                                1
                              ]
                            }
                          }
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
                      isMain: false
                    }
                  }
                },
                else: []
              }
            }
          }
        },
        {
          $addFields: {
            allSessions: {
              $concatArrays: [
                { $cond: [{ $ne: ["$mainSession", null] }, ["$mainSession"], []] },
                "$allRecurringSessions"
              ]
            }
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
            patient: {
              _id: "$patient._id",
              fullName: "$patient.fullName",
              email: "$patient.email"
            },
            sessions: "$allSessions"
          }
        }
      ]);

      if (appointments.length > 0) {
        const totalAmountForTherapist = appointments.reduce((acc, apt) => {
          return acc + apt.sessions.reduce((sessionAcc, session) => sessionAcc + session.price, 0);
        }, 0);

        availablePayments.push({
          therapistId: therapist._id,
          therapistName: therapist.fullName,
          therapistEmail: therapist.email,
          therapistLevel: therapist.level,
          totalAmount: totalAmountForTherapist,
          appointmentCount: appointments.length,
          appointments: appointments.map(apt => ({
            ...apt,
            therapist: { _id: therapist._id, level: therapist.level },
          }))
        });
      }
    }

    return NextResponse.json(availablePayments);
  } catch (error) {
    console.error("Error fetching available payments:", error);
    return NextResponse.json(
      { error: "Error fetching available payments" },
      { status: 500 }
    );
  }
}