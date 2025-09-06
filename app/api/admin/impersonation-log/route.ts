// app/api/admin/impersonation-logs/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import ImpersonationLog from '@/lib/db/models/ImpersonationLog';
import connectDB from '@/lib/db/connect';
import { authOptions } from '@/lib/auth/config';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  await connectDB();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const userId = searchParams.get('userId');
  const adminId = searchParams.get('adminId');
  const status = searchParams.get('status');

  const query: any = {};
  if (userId) query.userId = userId;
  if (adminId) query.adminId = adminId;
  if (status) query.status = status;

  const logs = await ImpersonationLog.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const total = await ImpersonationLog.countDocuments(query);

  return NextResponse.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}