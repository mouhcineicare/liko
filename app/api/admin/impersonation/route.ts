import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import AdminSettings from '@/lib/db/models/AdminSettings';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  await connectDB();

  const settings = await AdminSettings.findOne().select('+impersonationPassword');
  return NextResponse.json({ 
    isSet: !!settings?.impersonationPassword 
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  await connectDB();

  const { currentPassword, newPassword } = await req.json();
  
  let settings = await AdminSettings.findOne().select('+impersonationPassword');
  
  if (!settings) {
    settings = new AdminSettings();
  }
  
  if (settings.impersonationPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
    }
    
    const isMatch = await settings.compareImpersonationPassword(currentPassword);
    if (!isMatch) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }
  }
  
  settings.impersonationPassword = newPassword;
  await settings.save();
  
  return NextResponse.json({ success: true });
}