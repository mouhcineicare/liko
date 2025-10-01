import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Appointment from '@/lib/db/models/Appointment';

export async function GET() {
  try {
    await connectDB();
    
    // Find unpaid appointments and check which patient they belong to
    const unpaidAppointments = await Appointment.find({
      $and: [
        { isStripeVerified: { $ne: true } },
        { isBalance: { $ne: true } }
      ]
    })
    .populate('patient', 'email fullName')
    .sort({ createdAt: -1 })
    .limit(5);
    
    return NextResponse.json({
      message: 'Unpaid appointments with patient info',
      count: unpaidAppointments.length,
      appointments: unpaidAppointments.map(apt => ({
        _id: apt._id,
        date: apt.date,
        status: apt.status,
        price: apt.price,
        plan: apt.plan,
        isStripeVerified: apt.isStripeVerified,
        isBalance: apt.isBalance,
        paymentStatus: apt.paymentStatus,
        patient: {
          _id: apt.patient._id,
          email: apt.patient.email,
          fullName: apt.patient.fullName
        }
      }))
    });
    
  } catch (error) {
    console.error('Check unpaid patient error:', error);
    return NextResponse.json({ 
      error: 'Check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
