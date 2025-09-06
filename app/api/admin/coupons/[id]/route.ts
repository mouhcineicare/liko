// app/api/admin/coupons/[id]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import Coupon from '@/lib/db/models/Coupon';
import dbConnect from '@/lib/db/connect';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  await dbConnect();

  try {
    const body = await request.json();
    const updatedCoupon = await Coupon.findByIdAndUpdate(params.id, body, { new: true });
    
    if (!updatedCoupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }
    
    return NextResponse.json(updatedCoupon);
  } catch (error) {
    console.error('Coupon API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  await dbConnect();

  try {
    const deletedCoupon = await Coupon.findByIdAndDelete(params.id);
    
    if (!deletedCoupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Coupon API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}