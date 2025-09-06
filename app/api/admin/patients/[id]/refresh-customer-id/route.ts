import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { retrieveCustomerIdFromLastPayment } from '@/lib/stripe/verification';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const patientId = params.id;

    // Verify the patient exists
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Check if patient already has a customer ID
    if (patient.stripeCustomerId) {
      return NextResponse.json({
        success: true,
        message: 'Patient already has a Stripe customer ID',
        customerId: patient.stripeCustomerId
      });
    }

    // Try to retrieve customer ID from last payment
    const customerId = await retrieveCustomerIdFromLastPayment(patientId);

    if (!customerId) {
      return NextResponse.json({
        success: false,
        error: 'No payment history found for this patient. They need to make a payment first.',
        needsPayment: true
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Stripe customer ID retrieved and updated successfully',
      customerId: customerId
    });

  } catch (error) {
    console.error('Error refreshing customer ID:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
