import Coupon from '@/lib/db/models/Coupon';
import dbConnect from '@/lib/db/connect';

export async function validateCoupon(code: string, amount: number, therapistId?: string) {
  try {
    await dbConnect();
    
    const coupon = await Coupon.findOne({ 
      code, 
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });

    if (!coupon) {
      return { valid: false, error: 'Coupon not found or expired' };
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return { valid: false, error: 'Coupon usage limit reached' };
    }

    // Check minimum purchase
    if (coupon.minPurchase && amount < coupon.minPurchase) {
      return { 
        valid: false, 
        error: `Minimum purchase of ${coupon.minPurchase} required for this coupon`
      };
    }

    // Check if coupon is applicable to specific therapists
    if (coupon.applicableTo === 'specific' && therapistId) {
      if (!coupon.specificTherapists.includes(therapistId)) {
        return { 
          valid: false, 
          error: 'This coupon is not applicable to the selected therapist'
        };
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

    return {
      valid: true,
      discount,
      coupon: {
        id: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscount: coupon.maxDiscount
      }
    };

  } catch (error) {
    console.error('Coupon validation error:', error);
    return { valid: false, error: 'Internal server error' };
  }
}

export async function incrementCouponUsage(couponId: string) {
  try {
    await dbConnect();
    await Coupon.findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } });
  } catch (error) {
    console.error('Error incrementing coupon usage:', error);
  }
}