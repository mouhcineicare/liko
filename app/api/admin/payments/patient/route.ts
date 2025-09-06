import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth/config';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db/connect';
import { Appointment, User } from '@/lib/db/models';
import { getAllStripePaymentsByCustomerId } from '@/lib/stripe/getAllPayments';
import { getStripeCustomerIdByEmail } from '@/lib/stripe/getCustomerIdByEmail';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Step 1: Check user from DB
    const user = await User.findOne({ email });

    let stripeCustomerId: string | undefined = undefined;
    if (user?.stripeCustomerId) {
      stripeCustomerId = user.stripeCustomerId;
    } else {
      // Step 2: Try to get customer ID from Stripe using email
      const customerId = await getStripeCustomerIdByEmail(email);
      stripeCustomerId = customerId === null ? undefined : customerId;
    }

    let payments: ({ id: any; type: "charge"; amount: number; currency: any; created: any; description: any; metadata: any; receipt_url: any; status: any; } | { id: any; type: "subscription"; amount: number; currency: any; created: any; description: string; metadata: any; receipt_url: string | null; current_period_end: any; status: any; } | { id: any; type: "invoice"; amount: number; currency: any; created: any; description: any; metadata: any; receipt_url: string | null; status: any; })[] = [];
    if (stripeCustomerId) {
      const result = await getAllStripePaymentsByCustomerId(stripeCustomerId, email);
      payments = result.payments;
    }

    // Step 3: Get appointments if user exists
    const appointments = user ? await Appointment.find({ patient: user._id })
      .populate('patient', 'fullName email')
      .sort({ date: -1 }) : [];

    const formattedAppointments = appointments.map(apt => ({
      _id: apt._id.toString(),
      date: apt.date,
      price: apt.price,
      plan: apt.plan,
      status: apt.status,
      paymentStatus: apt.paymentStatus,
      totalSessions: apt.totalSessions,
      patient: {
        _id: apt.patient._id.toString(),
        fullName: apt.patient.fullName,
        email: apt.patient.email,
      },
      sessions: apt.recurring?.map((session: any, index: number) => ({
        _id: `${apt._id}-${index}`,
        date: session.date,
        price: apt.price / apt.totalSessions,
        status: session.status,
        paymentStatus: session.payment || 'pending',
        isPaid: session.payment === 'paid',
      })) || [{
        _id: `${apt._id}-main`,
        date: apt.date,
        price: apt.price,
        status: apt.status,
        paymentStatus: apt.paymentStatus,
        isPaid: apt.paymentStatus === 'completed',
      }],
    }));

    return NextResponse.json({
      payments,
      appointments: formattedAppointments
    });

  } catch (error) {
    console.error('Error fetching patient payment data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patient payment data' },
      { status: 500 }
    );
  }
}
