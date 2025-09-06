import { NextRequest, NextResponse } from 'next/server';
import Appointment from '@/lib/db/models/Appointment';
import connectDB from '@/lib/db/connect';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();
  const { id } = params;
  const { note } = await req.json();

  if (!id) {
    return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
  }

  try {
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }
    appointment.isPayoutRejected = true;
    appointment.rejectedPayoutNote = note || '';
    await appointment.save();
    return NextResponse.json({ success: true, appointment });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to reject payout', details: error }, { status: 500 });
  }
}