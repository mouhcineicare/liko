import { authOptions } from "@/lib/auth/config"
import TherapyProfile from "@/lib/db/models/Therapy-profile"
import User from "@/lib/db/models/User"
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
      const session = await getServerSession(authOptions)
  
      if (!session || session.user.role !== "therapist") {
        return new NextResponse("Unauthorized", { status: 401 })
      }
  
      const therapyId = session.user.id
  
      const profile = await TherapyProfile.findOne({therapyId})
  
      if (!profile) {
        return NextResponse.json({})
      }
  
      return NextResponse.json(profile)
    } catch (error) {
      console.error("[THERAPY_PROFILE_GET]", error)
      return new NextResponse("Internal Error", { status: 500 })
    }
}
  
export async function POST(req: Request) {
    try {
      const session = await getServerSession(authOptions);
  
      if (!session || session.user.role !== "therapist") {
        return new NextResponse("Unauthorized", { status: 401 });
      }
  
      const therapyId = session.user.id;
      const body = await req.json();
      
      console.log("Received data:", body); // Add this line
  
      const {
        aboutMe,
        therapeuticApproach,
        communicationApproach,
        professionalExperience,
        mentalHealthExpertise,
        communicationModes,
        spokenLanguages,
        licenseInformation,
        availability,
        timeZone,
      } = body;
  
      if (!aboutMe || !therapeuticApproach || !communicationApproach) {
        return new NextResponse("Missing required fields", { status: 400 });
      }

      try {
        const therapy = await User.findById(therapyId);
        therapy.timeZone = timeZone || 'Asia/Dubai';
        await therapy.save();
      } catch {
        console.log('Error updating therapist timezone');
      }
  
      const profile = await TherapyProfile.findOneAndUpdate(
        { therapyId },
        {
          $set: {
            aboutMe,
            therapeuticApproach,
            communicationApproach,
            professionalExperience,
            mentalHealthExpertise,
            communicationModes,
            spokenLanguages,
            licenseInformation,
            availability,
            updatedAt: new Date(),
            timeZone: timeZone || 'Asia/Dubai',
          },
        },
        {
          upsert: true,
          new: true,
        }
      );

      console.log("Updated profile:", profile); // Add this line
  
      return NextResponse.json(profile);
    } catch (error) {
      console.error("[THERAPY_PROFILE_POST]", error);
      return new NextResponse("Internal Error", { status: 500 });
    }
}
  
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "therapist") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const therapyId = session.user.id;
    const { availability } = await req.json();

    if (!availability) {
      return new NextResponse("Availability data required", { status: 400 });
    }

    const profile = await TherapyProfile.findOneAndUpdate(
      { therapyId },
      { $set: { availability, updatedAt: new Date() } },
      { new: true }
    );

    return NextResponse.json(profile);
  } catch (error) {
    console.error("[THERAPY_PROFILE_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}