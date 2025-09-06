import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import User from '@/lib/db/models/User';
import AdminSettings from '@/lib/db/models/AdminSettings';
import connectDB from '@/lib/db/connect';
import ImpersonationLog from '@/lib/db/models/ImpersonationLog';
import { authOptions } from '@/lib/auth/config';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  
    await connectDB();
  
    const { userId, password } = await req.json();
    
    // Verify impersonation password
    const settings = await AdminSettings.findOne().select('+impersonationPassword');
    if (!settings?.impersonationPassword) {
      return NextResponse.json({ error: 'Impersonation not configured' }, { status: 400 });
    }
    
    const isMatch = await settings.compareImpersonationPassword(password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid impersonation password' }, { status: 400 });
    }
    
    // Verify target user exists and is active
    const user = await User.findById(userId);
    if (!user || user.status !== 'active') {
      return NextResponse.json({ error: 'User not found or not active' }, { status: 400 });
    }
  
    // Log the impersonation attempt
    await ImpersonationLog.create({
      adminId: session.user.id,
      userId: user._id,
      userEmail: user.email,
      userName: user.fullName,
      userRole: user.role,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('remote-addr') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      status: 'success'
    });
  
    // For now, just return success - impersonation will be implemented later
    return NextResponse.json({ 
      success: true,
      redirectUrl: '/dashboard/admin'
    });
  }