import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import User from "@/lib/db/models/User";

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
    const user = await User.findById(params.id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Toggle user status
    user.status = user.status === "active" ? "banned" : "active";
    await user.save();

    return NextResponse.json({ message: "User status updated successfully" });
  } catch (error) {
    console.error("Error updating user status:", error);
    return NextResponse.json(
      { error: "Error updating user status" },
      { status: 500 }
    );
  }
}
