import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";

export async function GET() {
  try {
    const userSession = await getServerSession(authOptions);
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      user: {
        authenticated: !!userSession?.user?.id,
        userId: userSession?.user?.id || null,
        email: userSession?.user?.email || null,
      },
      environment: {
        stripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
        baseUrl: process.env.BASE_URL || 'not set',
        nodeEnv: process.env.NODE_ENV,
      },
      database: {
        mongodbUri: !!process.env.MONGODB_URI,
      }
    };

    console.log('Payment Debug Info:', JSON.stringify(debugInfo, null, 2));
    
    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('Payment Debug Error:', error);
    return NextResponse.json({ 
      error: 'Debug check failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
