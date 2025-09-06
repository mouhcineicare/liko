import { NextResponse } from 'next/server';
import Coupon from '@/lib/db/models/Coupon';
import dbConnect from '@/lib/db/connect';

export async function POST(request: Request) {
  await dbConnect();

  try {
    const { code, amount, therapistId } = await request.json();
    
    const coupon = await Coupon.findOne({ 
      code, 
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });

    if (!coupon) {
      return NextResponse.json(
        { error: 'Coupon not found or expired' },
        { status: 404 }
      );
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json(
        { error: 'Coupon usage limit reached' },
        { status: 400 }
      );
    }

    // Check minimum purchase
    if (coupon.minPurchase && amount < coupon.minPurchase) {
      return NextResponse.json(
        { error: `Minimum purchase of ${coupon.minPurchase} required for this coupon` },
        { status: 400 }
      );
    }

    // Check if coupon is applicable to specific therapists
    if (coupon.applicableTo === 'specific' && therapistId) {
      if (!coupon.specificTherapists.includes(therapistId)) {
        return NextResponse.json(
          { error: 'This coupon is not applicable to the selected therapist' },
          { status: 400 }
        );
      }
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = amount * (coupon.discountValue / 100);
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.discountValue;
    }

    return NextResponse.json({
      valid: true,
      discount,
      coupon: {
        id: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscount: coupon.maxDiscount
      }
    });

  } catch (error) {
    console.error('Coupon validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}