import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import User from "@/lib/db/models/User";
import { saveBase64Image, deleteOldProfileImage } from "@/lib/utils/image";

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fullName, image } = await req.json();

    await connectDB();
    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update user data
    if (fullName) {
      user.fullName = fullName;
    }

    // Handle image update
    if (image !== undefined) {
      if (image === null) {
        // Remove profile image
        await deleteOldProfileImage(user.image ?? null);
        user.image = null;
      } else if (image.startsWith("data:image/")) {
        // Save new image and get public URL
        const oldImage = user.image;
        const imageUrl = await saveBase64Image(image, user._id.toString());
        user.image = imageUrl;

        // Delete old image if it exists
        await deleteOldProfileImage(oldImage ?? null);
      }
    }

    await user.save();

    // Return updated user data
    return NextResponse.json({
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        image: user.image || null,
      },
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Error updating profile" },
      { status: 500 }
    );
  }
}
