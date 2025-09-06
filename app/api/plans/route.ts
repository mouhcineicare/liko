import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import Plan from "@/lib/db/models/Plan";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await connectDB();
    const plans = await Plan.find().sort({ createdAt: -1 });

    // Disable caching
    const response = NextResponse.json(plans);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

    return response;
  } catch (error) {
    console.error("Error fetching plans:", error);
    return NextResponse.json(
      { error: "Error fetching plans" },
      { status: 500 }
    );
  }
}
