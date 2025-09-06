import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import Balance from '@/lib/db/models/Balance';
import User from '@/lib/db/models/User';
import dbConnect from '@/lib/db/connect';
import { authOptions } from '@/lib/auth/config';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, action, sessions, reason, payment, price } = await req.json();

    if (!userId || !action || sessions === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== 'patient') {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    let balance = await Balance.findOne({ user: userId });
    if (!balance) {
      balance = new Balance({ user: userId });
    }

    const DEFAULT_BALANCE_RATE = 90;

    if (action === 'add') {
      // Verify payment or plan is provided
      if (!payment) {
        return NextResponse.json({ 
          error: 'Payment verification or plan selection is required to add sessions' 
        }, { status: 400 });
      }

      // Remove the session validation against price
      balance.totalSessions += parseFloat(sessions);

      const historyItem: any = {
        action: 'added',
        sessions: parseFloat(sessions),
        admin: session.user.id,
        reason,
        price,
        createdAt: new Date()
      };

      balance.history.push(historyItem);

      // Record the payment if adding sessions with payment
      if (payment) {
        if (balance.payments.some((p: { paymentId: any; }) => p.paymentId === payment.id)) {
          return NextResponse.json({
            error: 'This payment has already been used to add sessions'
          }, { status: 400 });
        }

        balance.payments.push({
          paymentId: payment.id,
          amount: price,
          currency: payment.currency || 'AED',
          date: new Date(payment.created * 1000),
          sessionsAdded: parseFloat(sessions),
          receiptUrl: payment.receipt_url,
          paymentType: payment.object === 'checkout.session' ? 'checkout_session' : 
                      payment.object === 'payment_intent' ? 'payment_intent' :
                      payment.object === 'charge' ? 'charge' :
                      payment.object === 'subscription' ? 'subscription' : 'unknown'
        });
      }

    } else if (action === 'remove') {
      if (balance.totalSessions < sessions) {
        return NextResponse.json({
          error: 'Cannot remove more sessions than available'
        }, { status: 400 });
      }

      balance.totalSessions -= parseFloat(sessions);

      balance.history.push({
        action: 'removed',
        sessions: parseFloat(sessions),
        admin: session.user.id,
        reason,
        createdAt: new Date()
      });

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await balance.save();

    return NextResponse.json({
      success: true,
      balance
    });

  } catch (error) {
    console.error('Error managing sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}