import { NextResponse } from 'next/server';
import Appointment from '@/lib/db/models/Appointment';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

// PATCH: Admin updates session payment status, price, payout, or pays sessions
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionIndex, payment, price, payoutPercent } = await req.json();
  const appointment = await Appointment.findById(params.id);
  if (!appointment) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
  }

  // Fix: allow paying the main appointment date session (index 0)
  if (typeof sessionIndex !== 'number' || sessionIndex < 0 || sessionIndex >= appointment.recurring.length + 1) {
    return NextResponse.json({ error: 'Invalid session index' }, { status: 400 });
  }

  // If paying the main appointment date session (index 0)
  if (sessionIndex === 0) {
    // Find if the main session is already in recurring
    const mainDate = appointment.date instanceof Date ? appointment.date.toISOString() : appointment.date;
    let foundIdx = appointment.recurring.findIndex(
      (s: any) => (typeof s === 'string' ? s === mainDate : s.date === mainDate)
    );
    if (foundIdx === -1) {
      // Not found, insert as new paid/completed session at the start
      appointment.recurring.unshift({ date: mainDate, status: 'completed', payment: 'paid' });
    } else {
      // Found, update status/payment
      if (typeof appointment.recurring[foundIdx] === 'string') {
        appointment.recurring[foundIdx] = { date: mainDate, status: 'completed', payment: 'paid' };
      } else {
        appointment.recurring[foundIdx].status = 'completed';
        appointment.recurring[foundIdx].payment = 'paid';
      }
    }
    await appointment.save();
    return NextResponse.json({ success: true, mainSessionPaid: true, recurring: appointment.recurring });
  }

  // For recurring sessions (index > 0), adjust index and update recurring array
  const recurringIdx = sessionIndex - 1;
  // If session is in old format (string), convert to new format before updating
  if (typeof appointment.recurring[recurringIdx] === 'string') {
    appointment.recurring[recurringIdx] = {
      date: appointment.recurring[recurringIdx],
      status: 'completed',
      payment: payment || 'not_paid',
      price: price || undefined,
      payoutPercent: payoutPercent || undefined,
    };
  }
  if (payment) {
    appointment.recurring[recurringIdx].payment = payment;
  }
  if (typeof price === 'number') {
    appointment.recurring[recurringIdx].price = price;
  }
  if (typeof payoutPercent === 'number') {
    appointment.recurring[recurringIdx].payoutPercent = payoutPercent;
  }
  await appointment.save();
  return NextResponse.json({ success: true, recurring: appointment.recurring });
}
