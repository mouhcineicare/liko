import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Appointment from '@/lib/db/models/Appointment';

export async function GET() {
  try {
    await connectDB();
    
    // Find appointments that are NOT Stripe verified and NOT balance payments
    const unpaidAppointments = await Appointment.find({
      $and: [
        { isStripeVerified: { $ne: true } },
        { isBalance: { $ne: true } }
      ]
    })
    .populate('therapist', 'fullName')
    .sort({ createdAt: -1 })
    .limit(10);
    
    // Also find appointments with isStripeVerified: false specifically
    const notStripeVerified = await Appointment.find({
      isStripeVerified: false
    })
    .populate('therapist', 'fullName')
    .sort({ createdAt: -1 })
    .limit(10);
    
    // Find appointments with isBalance: false specifically
    const notBalance = await Appointment.find({
      isBalance: false
    })
    .populate('therapist', 'fullName')
    .sort({ createdAt: -1 })
    .limit(10);
    
    // Find appointments with pending payment status
    const pendingPayment = await Appointment.find({
      paymentStatus: 'pending'
    })
    .populate('therapist', 'fullName')
    .sort({ createdAt: -1 })
    .limit(10);
    
    return NextResponse.json({
      message: 'Search for unpaid appointments completed',
      counts: {
        unpaidAppointments: unpaidAppointments.length,
        notStripeVerified: notStripeVerified.length,
        notBalance: notBalance.length,
        pendingPayment: pendingPayment.length
      },
      unpaidAppointments: unpaidAppointments.map(apt => ({
        _id: apt._id,
        date: apt.date,
        status: apt.status,
        price: apt.price,
        plan: apt.plan,
        isStripeVerified: apt.isStripeVerified,
        isBalance: apt.isBalance,
        paymentStatus: apt.paymentStatus,
        checkoutSessionId: apt.checkoutSessionId,
        paymentIntentId: apt.paymentIntentId,
        paidAt: apt.paidAt
      })),
      notStripeVerified: notStripeVerified.map(apt => ({
        _id: apt._id,
        date: apt.date,
        status: apt.status,
        price: apt.price,
        plan: apt.plan,
        isStripeVerified: apt.isStripeVerified,
        isBalance: apt.isBalance,
        paymentStatus: apt.paymentStatus,
        checkoutSessionId: apt.checkoutSessionId,
        paymentIntentId: apt.paymentIntentId,
        paidAt: apt.paidAt
      })),
      notBalance: notBalance.map(apt => ({
        _id: apt._id,
        date: apt.date,
        status: apt.status,
        price: apt.price,
        plan: apt.plan,
        isStripeVerified: apt.isStripeVerified,
        isBalance: apt.isBalance,
        paymentStatus: apt.paymentStatus,
        checkoutSessionId: apt.checkoutSessionId,
        paymentIntentId: apt.paymentIntentId,
        paidAt: apt.paidAt
      })),
      pendingPayment: pendingPayment.map(apt => ({
        _id: apt._id,
        date: apt.date,
        status: apt.status,
        price: apt.price,
        plan: apt.plan,
        isStripeVerified: apt.isStripeVerified,
        isBalance: apt.isBalance,
        paymentStatus: apt.paymentStatus,
        checkoutSessionId: apt.checkoutSessionId,
        paymentIntentId: apt.paymentIntentId,
        paidAt: apt.paidAt
      }))
    });
    
  } catch (error) {
    console.error('Find unpaid appointments error:', error);
    return NextResponse.json({ 
      error: 'Search failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
