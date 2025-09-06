import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Plan from "@/lib/db/models/Plan";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const plan = await Plan.findById(params.id);

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    plan.active = !plan.active;
    await plan.save();

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Error toggling plan status:", error);
    return NextResponse.json(
      { error: "Error toggling plan status" },
      { status: 500 }
    );
  }
}