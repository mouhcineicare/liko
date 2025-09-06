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

    // Update email log with open tracking
    await EmailLog.findByIdAndUpdate(params.logId, {
      status: 'opened',
      $inc: { 'metadata.openCount': 1 },
      $set: {
        'metadata.lastOpenedAt': new Date(),
        'metadata.userAgent': userAgent,
        'metadata.ipAddress': ipAddress
      }
    });

    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    return new NextResponse(pixel, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error tracking email open:', error);
    
    // Still return pixel even if tracking fails
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    return new NextResponse(pixel, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}
