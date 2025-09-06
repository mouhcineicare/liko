import bcrypt from "bcryptjs";
import User from "@/lib/db/models/User";
import connectDB from "@/lib/db/connect";

function getDefaultImage(role: string): string {
  switch (role) {
    case 'therapist':
      return 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400';
    case 'patient':
      return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400';
    case 'admin':
      return 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400';
    default:
      return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400';
  }
}

export async function verifyCredentials(credentials: any) {
  try {
    await connectDB();
    
    const user = await User.findOne({ 
      email: credentials.email.toLowerCase()
    });

    if (!user) {
      return null;
    }

    // Handle email verification sign-in (password starts with "email-signin-")
    if (credentials.password.startsWith("email-signin-")) {
      // For email verification, we just need to check user exists and isn't banned
      if (user.status === "banned") {
        throw new Error("Your account has been banned");
      }
      
      return {
        id: user._id.toString(),
        name: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        isCalendarConnected: user.isCalendarConnected,
        therapyId: user.therapy,
      };
    }

    // Handle regular password-based sign-in
    const isValid = await bcrypt.compare(credentials.password, user.password);
    
    if (!isValid) {
      return null;
    }

    if (user.status === "banned") {
      throw new Error("Your account has been banned");
    }

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.fullName || null,
      role: user.role as "patient" | "therapist" | "admin",
      isCalendarConnected: user.isCalendarConnected || false,
      status: user.status as "pending" | "active" | "banned" | "in_review",
      therapyId: user.therapy || null,
    };
  } catch (error) {
    console.error("Auth error in verifyCredentials:", error);
    return null;
  }
}