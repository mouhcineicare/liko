import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import User from "@/lib/db/models/User";
import { deleteOldProfileImage, saveBase64ImageAdmin } from "@/lib/utils/image";

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { image } = await req.json();

    await connectDB();
    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Handle image update
    if (image !== undefined) {
      if (image === null) {
        // Remove profile image if user has one
        if (user.image) {
          await deleteOldProfileImage(user.image);
        }
        user.image = null;
      } else if (typeof image === "string" && image.startsWith("data:image/")) {
        // Save new image and get public URL
        const oldImage = user.image || null;
        const imageUrl = await saveBase64ImageAdmin(image, user._id.toString());
        user.image = imageUrl;

        // Delete old image if it exists
        if (oldImage) {
          await deleteOldProfileImage(oldImage);
        }
      }
    }

    await user.save();

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
