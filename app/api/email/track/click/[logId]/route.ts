import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import EmailLog from '@/lib/db/models/EmailLog';

export async function GET(
  request: NextRequest,
  { params }: { params: { logId: string } }
) {
  try {
    await connectDB();

    // Get client IP and user agent
    const userAgent = request.headers.get('user-agent') || '';
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : request.ip || '';

    // Update email log with click tracking
    await EmailLog.findByIdAndUpdate(params.logId, {
      status: 'clicked',
      $inc: { 'metadata.clickCount': 1 },
      $set: {
        'metadata.lastClickedAt': new Date(),
        'metadata.userAgent': userAgent,
        'metadata.ipAddress': ipAddress
      }
    });

    // Get the original URL from query parameters
    const url = new URL(request.url);
    const redirectUrl = url.searchParams.get('url') || '/';

    // Redirect to the original URL
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error tracking email click:', error);
    
    // Fallback redirect
    const url = new URL(request.url);
    const redirectUrl = url.searchParams.get('url') || '/';
    return NextResponse.redirect(redirectUrl);
  }
}
