import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Generate auth URL
export async function GET() {
  const scopes = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar",
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent", // Force to get refresh token
  });

  return NextResponse.json({ url });
}

// Handle callback and get refresh token
export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    const { tokens } = await oauth2Client.getToken(code);
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      throw new Error("No refresh token received");
    }

    return NextResponse.json({ refreshToken });
  } catch (error) {
    console.error("Error getting refresh token:", error);
    return NextResponse.json(
      { error: "Failed to get refresh token" },
      { status: 500 }
    );
  }
}
