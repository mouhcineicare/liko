import { NextResponse } from 'next/server';
import Appointment from '@/lib/db/models/Appointment';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

// PATCH: Therapist updates session status or date
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'therapist') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionIndex, status, date } = await req.json();
  const appointment = await Appointment.findById(params.id);
  if (!appointment) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
  }

  if (typeof sessionIndex !== 'number' || !appointment.recurring[sessionIndex]) {
    return NextResponse.json({ error: 'Invalid session index' }, { status: 400 });
  }

  // If session is in old format (string), convert to new format before updating
  if (typeof appointment.recurring[sessionIndex] === 'string') {
    appointment.recurring[sessionIndex] = {
      date: appointment.recurring[sessionIndex],
      status: status || 'in_progress',
      payment: 'not_paid',
    };
  }

  if (status) {
    appointment.recurring[sessionIndex].status = status;
  }
  if (date) {
    appointment.recurring[sessionIndex].date = date;
  }
  await appointment.save();
  return NextResponse.json({ success: true, recurring: appointment.recurring });
}
