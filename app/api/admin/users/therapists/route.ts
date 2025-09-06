import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import User from "@/lib/db/models/User";
import TherapistPayoutInfo from "@/lib/db/models/TherapistPayoutInfo";

export const dynamic = 'force-dynamic';


export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const populatePayout = searchParams.get("populatePayout") === "true";
    const skip = (page - 1) * limit;

    await connectDB();

    // Build the query
    let query: any = { role: "therapist" };
    
    if (searchQuery) {
      const searchRegex = new RegExp(searchQuery, "i");
      query = {
        ...query,
        $or: [
          { fullName: searchRegex },
          { email: searchRegex },
          { telephone: searchRegex },
          { specialties: searchRegex }
        ]
      };
    }

    // Get total count for pagination
    const totalTherapists = await User.countDocuments(query);

    // Fetch therapists
    let therapists = await User.find(query)
      .select('fullName email telephone specialties createdAt status profile _id')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();


    // Only fetch payout info if requested
    if (populatePayout) {
      const therapistIds = therapists.map(t => t._id);
      
      // Fetch all payout info for these therapists in one query
      const payoutInfos = await TherapistPayoutInfo.find(
        { therapist: { $in: therapistIds } }
      ).lean();


      // Create a map for quick lookup
      const payoutMap = new Map(
        payoutInfos.map(info => {
          return [
            info.therapist.toString(),
            {
              expectedPayoutDate: info.payoutSettings?.expectedPayoutDate || null,
              payoutFrequency: info.payoutSettings?.schedule || 'weekly'
            }
          ];
        })
      );


      // Merge the data
      therapists = therapists.map(therapist => {
        const payoutInfo = payoutMap.get(therapist._id.toString()) || {
          expectedPayoutDate: null,
          payoutFrequency: 'weekly'
        };
        return {
          ...therapist,
          payoutInfo
        };
      });
    }

    return NextResponse.json({
      therapists,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalTherapists / limit),
        totalTherapists,
        hasNextPage: page < Math.ceil(totalTherapists / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching therapists" },
      { status: 500 }
    );
  }
}